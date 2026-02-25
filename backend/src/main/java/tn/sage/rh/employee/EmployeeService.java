package tn.sage.rh.employee;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.employee.dto.EmployeeRequestDto;
import tn.sage.rh.employee.dto.OperatorAvailabilityDTO;
import tn.sage.rh.employee.event.EmployeeBatchSaveEvent;
import tn.sage.rh.employee.event.EmployeeCreationEvent;
import tn.sage.rh.organization.entity.*;
import tn.sage.rh.organization.service.*;
import tn.sage.rh.user.User;

import java.security.Principal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static tn.sage.rh.user.UserRole.SUPERVISOR;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final DepartmentService departmentService;
    private final JobTitleService jobTitleService;
    private final ProductionLineService productionLineService;
    private final ShiftService shiftService;
    private final EmploymentTypeService employmentTypeService;

    // =========================
    // CREATE / UPDATE / DELETE
    // =========================

    @Transactional
    public void save(EmployeeRequestDto employeeRequest) {
        employeeRepository.findByMatricule(employeeRequest.getMatricule())
                .ifPresent(employee -> {
                    throw new IllegalStateException("An employee already exists for this matricule.");
                });

        Employee employee = new Employee();
        setEmployeeFromRequestDTO(employee, employeeRequest, null);

        employeeRepository.save(employee);
        eventPublisher.publishEvent(new EmployeeCreationEvent(employee));
    }

    @Transactional
    public void update(Long id, EmployeeRequestDto employeeRequest) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Employee not found for this matricule."));

        setEmployeeFromRequestDTO(employee, employeeRequest, null);
        employeeRepository.save(employee);
    }

    @Transactional
    public void delete(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Employee not found for this matricule."));

        if (employee.getOperators() != null && !employee.getOperators().isEmpty()) {
            employee.getOperators().forEach(operator -> operator.setSupervisor(null));
        }

        employee.setDeleted(true);
        employeeRepository.save(employee);
    }

    // =========================
    // LISTING
    // =========================

    public List<Employee> findAll(Principal connectedUser) {
        User user = getUserFromPrincipal(connectedUser);

        if (user.getRole() == SUPERVISOR) {
            // ton repo actuel : findAllBySupervisor(username)
            return employeeRepository.findAllBySupervisor(user.getUsername());
        }

        return employeeRepository.findAll();
    }
    public Page<Employee> search(Principal connectedUser, String query, int page, int size) {
        User user = getUserFromPrincipal(connectedUser);
        Pageable pageable = PageRequest.of(page, size);

        if (user.getRole() == SUPERVISOR) {
            return employeeRepository.findAllBySupervisorWithSearch(user.getUsername(), query, pageable);
        }

        return employeeRepository.findAllWithSearch(query, pageable);
    }


    public Page<Employee> findAll(Principal connectedUser, int page, int size) {
        User user = getUserFromPrincipal(connectedUser);
        Pageable pageable = PageRequest.of(page, size);

        if (user.getRole() == SUPERVISOR) {
            return employeeRepository.findAllBySupervisor(user.getUsername(), pageable);
        }

        return employeeRepository.findAll(pageable);
    }
    public Optional<Employee> findByIdOrMatricule(Long id, String matricule) {
        if (id != null) return employeeRepository.findById(id);
        if (matricule != null) return employeeRepository.findByMatricule(matricule);
        throw new IllegalArgumentException("Employee must have either an id or a matricule.");
    }

    // =========================
    // BATCH SAVE
    // =========================

    @Transactional
    public void batchSave(List<EmployeeRequestDto> employeeRequests) {
        Map<String, EmployeeRequestDto> employeeRequestsMap = employeeRequests.stream()
                .collect(Collectors.toMap(
                        EmployeeRequestDto::getMatricule,
                        r -> r,
                        (r1, r2) -> {
                            throw new IllegalStateException("Duplicate matricule in batch request: " + r1.getMatricule());
                        }
                ));

        Set<String> matricules = employeeRequestsMap.keySet();

        Map<String, Employee> existingEmployeesMap = employeeRepository.findAllByMatriculeIn(matricules)
                .stream()
                .collect(Collectors.toMap(Employee::getMatricule, e -> e));

        Set<String> supervisorMatricules = employeeRequests.stream()
                .map(EmployeeRequestDto::getSupervisor)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, Employee> existingSupervisorsMap = employeeRepository.findAllByMatriculeIn(supervisorMatricules)
                .stream()
                .collect(Collectors.toMap(Employee::getMatricule, e -> e));

        Map<String, Employee> processedEmployees = new HashMap<>();

        Context context = buildContext(employeeRequests);

        for (EmployeeRequestDto employeeRequest : employeeRequests) {
            Employee employee = existingEmployeesMap.getOrDefault(employeeRequest.getMatricule(), new Employee());
            setEmployeeFromRequestDTO(employee, employeeRequest, context);

            if (employeeRequest.getSupervisor() != null) {
                Employee supervisor = existingSupervisorsMap.get(employeeRequest.getSupervisor());
                if (supervisor != null) employee.setSupervisor(supervisor);
            }

            processedEmployees.put(employeeRequest.getMatricule(), employee);
        }

        // 2ème passe : lier superviseur si pas encore en DB mais présent dans batch
        for (EmployeeRequestDto employeeRequest : employeeRequests) {
            Employee employee = processedEmployees.get(employeeRequest.getMatricule());

            if (employee.getSupervisor() == null && employeeRequest.getSupervisor() != null) {
                Employee supervisor = processedEmployees.get(employeeRequest.getSupervisor());
                if (supervisor != null) employee.setSupervisor(supervisor);
            }
        }

        List<Employee> savedEmployees = employeeRepository.saveAll(processedEmployees.values());
        eventPublisher.publishEvent(new EmployeeBatchSaveEvent(savedEmployees));
    }

    // =========================
    // HELPERS
    // =========================

    private User getUserFromPrincipal(Principal connectedUser) {
        if (!(connectedUser instanceof UsernamePasswordAuthenticationToken token)) {
            throw new IllegalStateException("Invalid Principal type");
        }
        Object principal = token.getPrincipal();
        if (!(principal instanceof User user)) {
            throw new IllegalStateException("Principal is not a User");
        }
        return user;
    }

    public boolean isHireDateBeforeCurrentMonth(LocalDate hireDate) {
        if (hireDate == null) return false;

        YearMonth currentYearMonth = YearMonth.now(ZoneId.of("Africa/Tunis"));
        int currentMonth = currentYearMonth.getMonthValue();
        int currentYear = currentYearMonth.getYear();

        int hireMonth = hireDate.getMonthValue();
        int hireYear = hireDate.getYear();

        return hireYear < currentYear || (hireYear == currentYear && hireMonth < currentMonth);
    }

    private void setEmployeeFromRequestDTO(Employee employee, EmployeeRequestDto employeeRequest, Context context) {
        Employee supervisor = null;
        Department department;
        JobTitle jobTitle;
        ProductionLine productionLine;
        Shift shift;
        EmploymentType employmentType;

        if (context != null) {
            department = context.departments.get(employeeRequest.getDepartment());
            jobTitle = context.jobTitles.get(employeeRequest.getJobTitle());
            productionLine = context.productionLines.get(employeeRequest.getProductionLine());
            shift = context.shifts.get(employeeRequest.getShift());
            employmentType = context.employmentTypes.get(employeeRequest.getEmploymentType());
        } else {
            department = departmentService.findOrCreateDepartment(employeeRequest.getDepartment());
            jobTitle = jobTitleService.findOrCreateJobTitle(employeeRequest.getJobTitle());
            productionLine = productionLineService.findOrCreateProductionLine(employeeRequest.getProductionLine());
            shift = shiftService.findOrCreateShift(employeeRequest.getShift());
            employmentType = employmentTypeService.findOrCreateEmploymentType(employeeRequest.getEmploymentType());

            if (employeeRequest.getSupervisor() != null) {
                supervisor = employeeRepository.findByMatricule(employeeRequest.getSupervisor())
                        .orElseThrow(() -> new EntityNotFoundException("Superviseur non trouvé."));
            }
        }

        employee.setMatricule(employeeRequest.getMatricule());
        employee.setCivility(employeeRequest.getCivility());
        employee.setFullName(employeeRequest.getFullName());
        employee.setHireDate(employeeRequest.getHireDate());
        employee.setHasBankDomiciliation(employeeRequest.isHasBankDomiciliation());
        employee.setDepartment(department);
        employee.setJobTitle(jobTitle);
        employee.setProductionLine(productionLine);
        employee.setShift(shift);
        employee.setEmploymentType(employmentType);
        employee.setSupervisor(supervisor);
    }

    private Context buildContext(List<EmployeeRequestDto> requests) {
        Context context = new Context();

        context.departments = requests.stream()
                .map(EmployeeRequestDto::getDepartment)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toMap(Function.identity(), departmentService::findOrCreateDepartment));

        context.jobTitles = requests.stream()
                .map(EmployeeRequestDto::getJobTitle)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toMap(Function.identity(), jobTitleService::findOrCreateJobTitle));

        context.productionLines = requests.stream()
                .map(EmployeeRequestDto::getProductionLine)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toMap(Function.identity(), productionLineService::findOrCreateProductionLine));

        context.shifts = requests.stream()
                .map(EmployeeRequestDto::getShift)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toMap(Function.identity(), shiftService::findOrCreateShift));

        context.employmentTypes = requests.stream()
                .map(EmployeeRequestDto::getEmploymentType)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toMap(Function.identity(), employmentTypeService::findOrCreateEmploymentType));

        return context;
    }

    private static class Context {
        Map<String, Department> departments;
        Map<String, JobTitle> jobTitles;
        Map<String, ProductionLine> productionLines;
        Map<String, Shift> shifts;
        Map<String, EmploymentType> employmentTypes;
    }

    @Transactional(readOnly = true)
    public List<Employee> findAllSupervisors() {
        return employeeRepository.findAllSupervisors();
    }

    public List<Employee> findAvailableOperators(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) throw new IllegalArgumentException("startDate and endDate are required");
        if (endDate.isBefore(startDate)) throw new IllegalArgumentException("End date must be after start date");
        return employeeRepository.findAvailableOperators(startDate, endDate);
    }

    // =========================
    // FREE / BUSY
    // =========================

    @Transactional
    public void markOperatorsAsFree(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            throw new IllegalArgumentException("Employee ids list must not be empty");
        }

        List<Employee> employees = employeeRepository.findAllById(employeeIds);

        if (employees.size() != employeeIds.size()) {
            throw new EntityNotFoundException("One or more employees not found");
        }

        employees.forEach(employee -> employee.setFree(true));
        employeeRepository.saveAll(employees);
    }

    @Transactional
    public void markOperatorsAsBusy(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            throw new IllegalArgumentException("Employee ids list must not be empty");
        }

        List<Employee> employees = employeeRepository.findAllById(employeeIds);

        if (employees.size() != employeeIds.size()) {
            throw new EntityNotFoundException("One or more employees not found");
        }

        employees.forEach(employee -> employee.setFree(false));
        employeeRepository.saveAll(employees);
    }

    /**
     * ✅ Pool "free" GLOBAL (si tu veux encore l'utiliser en ADMIN par ex.)
     */
    @Transactional(readOnly = true)
    public List<Employee> findFreeEmployees() {
        return employeeRepository.findByFreeTrueAndDeletedFalse();
    }

    /**
     * ✅ Pool "free" filtré pour le SUPERVISOR connecté :
     * il ne doit pas voir ses propres opérateurs.
     */
    @Transactional(readOnly = true)
    public List<Employee> findFreeEmployeesForCurrentSupervisor(Principal connectedUser) {
        User user = getUserFromPrincipal(connectedUser);

        // si pas supervisor → renvoyer tout (ou tu peux restreindre selon ton besoin)
        if (user.getRole() != SUPERVISOR) {
            return employeeRepository.findByFreeTrueAndDeletedFalse();
        }

        // IMPORTANT: ici on utilise username comme matricule (vu ton code findAllBySupervisor(user.getUsername()))
        String supervisorMatricule = user.getUsername();

        return employeeRepository.findFreeEmployeesExcludingSupervisorOperators(supervisorMatricule);
    }
    public List<EmployeeDto> getFreeOperators() {
        return employeeRepository.findFreeOperators()
                .stream()
                .map(e -> EmployeeDto.builder()
                        .id(e.getId())
                        .fullName(e.getFullName())
                        .matricule(e.getMatricule())
                        .free(e.isFree())
                        .build())
                .toList();
    }
    // tn/sage/rh/employee/EmployeeServiceImpl.java (ou un service dédié)
    public List<OperatorAvailabilityDTO> getFreeOperatorsForOperationalManager() {
        return employeeRepository.findFreeOperatorsWithSupervisor()
                .stream()
                .map(op -> {
                    Employee sup = op.getSupervisor();
                    return OperatorAvailabilityDTO.builder()
                            .id(op.getId())
                            .fullName(op.getFullName())
                            .matricule(op.getMatricule())
                            .free(op.isFree())
                            .supervisorId(sup != null ? sup.getId() : null)
                            .supervisorFullName(sup != null ? sup.getFullName() : null)
                            .supervisorMatricule(sup != null ? sup.getMatricule() : null)
                            .build();
                })
                .toList();
    }
    @Transactional(readOnly = true)
    public List<Employee> findMyOperatorsEligibleForFreeToday(Principal connectedUser, LocalDate day, java.time.LocalTime start, java.time.LocalTime end) {
        User user = getUserFromPrincipal(connectedUser);

        if (user.getRole() != SUPERVISOR) {
            throw new org.springframework.security.access.AccessDeniedException("Only SUPERVISOR");
        }

        String supervisorMatricule = user.getUsername();

        return employeeRepository.findMyOperatorsAvailableForDay(
                supervisorMatricule,
                day,
                start,
                end
        );
    }

}
