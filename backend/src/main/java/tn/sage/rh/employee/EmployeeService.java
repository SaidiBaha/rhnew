package tn.sage.rh.employee;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.employee.dto.EmployeeRequestDto;
import tn.sage.rh.employee.dto.OperatorAvailabilityDTO;
import tn.sage.rh.employee.dto.SupervisorDto;
import tn.sage.rh.employee.event.EmployeeBatchSaveEvent;
import tn.sage.rh.employee.event.EmployeeCreationEvent;
import tn.sage.rh.exeption.EntityNotFoundException;
import tn.sage.rh.exeption.ErrorCodes;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.exeption.InvalidOperationException;
import tn.sage.rh.organization.entity.*;
import tn.sage.rh.organization.service.*;
import tn.sage.rh.user.User;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.sage.rh.employee.dto.EmployeeStatsDto;
import java.security.Principal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static tn.sage.rh.user.UserRole.SUPERVISOR;

@Service
@RequiredArgsConstructor
@Slf4j
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

        validateEmployeeRequest(employeeRequest);

        employeeRepository.findByMatricule(employeeRequest.getMatricule())
                .ifPresent(e -> {
                    throw new InvalidOperationException(
                            "Un employé existe déjà avec ce matricule : " + employeeRequest.getMatricule(),
                            ErrorCodes.EMPLOYEE_ALREADY_EXISTS
                    );
                });

        Employee employee = new Employee();
        setEmployeeFromRequestDTO(employee, employeeRequest, null);

        employeeRepository.save(employee);
        eventPublisher.publishEvent(new EmployeeCreationEvent(employee));
    }

    @Transactional
    public void update(Long id, EmployeeRequestDto employeeRequest) {

        if (id == null) {
            throw new InvalidOperationException(
                    "L'id de l'employé est obligatoire pour la mise à jour",
                    ErrorCodes.INVALID_INPUT
            );
        }

        validateEmployeeRequest(employeeRequest);

        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Employé introuvable (id=" + id + ")",
                        ErrorCodes.EMPLOYEE_NOT_FOUND
                ));

        // Si le matricule change, on empêche la collision avec un autre employé
        employeeRepository.findByMatricule(employeeRequest.getMatricule())
                .filter(existing -> !Objects.equals(existing.getId(), employee.getId()))
                .ifPresent(existing -> {
                    throw new InvalidOperationException(
                            "Ce matricule est déjà utilisé : " + employeeRequest.getMatricule(),
                            ErrorCodes.EMPLOYEE_ALREADY_IN_USE
                    );
                });

        setEmployeeFromRequestDTO(employee, employeeRequest, null);
        employeeRepository.save(employee);
    }

    @Transactional
    public void delete(Long id) {

        if (id == null) {
            throw new InvalidOperationException(
                    "L'id de l'employé est obligatoire pour la suppression",
                    ErrorCodes.INVALID_INPUT
            );
        }

        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Employé introuvable (id=" + id + ")",
                        ErrorCodes.EMPLOYEE_NOT_FOUND
                ));

        // logique métier inchangée
        if (employee.getOperators() != null && !employee.getOperators().isEmpty()) {
            employee.getOperators().forEach(operator -> operator.setSupervisor(null));
        }

        employee.setDeleted(true);
        employeeRepository.save(employee);
    }

    // =========================
    // LISTING
    // =========================
    @Transactional(readOnly = true)
    public Page<Employee> findAllByPagination(
            Principal connectedUser,
            String search,
            String productionLine,
            String shift,
            String employmentType,
            LocalDate hireDateFrom,
            LocalDate hireDateTo,
            String leftCompanyFilter,
            Pageable pageable) {

        User user = getUserFromPrincipal(connectedUser);

        String supervisorMatricule = (user.getRole() == SUPERVISOR) ? user.getUsername() : null;
        String searchTerm = (search != null && !search.isBlank()) ? search.trim() : null;
        String plTerm = (productionLine != null && !productionLine.isBlank()) ? productionLine.trim() : null;
        String shiftTerm = (shift != null && !shift.isBlank()) ? shift.trim() : null;
        String etTerm = (employmentType != null && !employmentType.isBlank()) ? employmentType.trim() : null;
        String leftFilter = (leftCompanyFilter != null && !leftCompanyFilter.isBlank())
                ? leftCompanyFilter.trim().toUpperCase()
                : "ALL";

        return employeeRepository.findPagedWithFilters(
                supervisorMatricule,
                searchTerm,
                plTerm,
                shiftTerm,
                etTerm,
                hireDateFrom,
                hireDateTo,
                leftFilter,
                pageable
        );
    }
    @Transactional(readOnly = true)
    public List<Employee> findAll(Principal connectedUser) {
        User user = getUserFromPrincipal(connectedUser);

        if (user.getRole() == SUPERVISOR) {
            return employeeRepository.findAllBySupervisor(user.getUsername());
        }

        return employeeRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Employee> findByIdOrMatricule(Long id, String matricule) {
        if (id != null) return employeeRepository.findById(id);
        if (matricule != null) return employeeRepository.findByMatricule(matricule);

        throw new InvalidOperationException(
                "Employee doit avoir soit un id soit un matricule",
                ErrorCodes.INVALID_INPUT
        );
    }

    // =========================
    // BATCH SAVE
    // =========================

    @Transactional
    public void batchSave(List<EmployeeRequestDto> employeeRequests) {

        if (employeeRequests == null || employeeRequests.isEmpty()) {
            throw new InvalidOperationException(
                    "La liste des employés à importer ne peut pas être vide",
                    ErrorCodes.INVALID_INPUT
            );
        }

        // 1) Validation de chaque ligne (accumulation des erreurs)
        List<String> allErrors = new ArrayList<>();
        for (int i = 0; i < employeeRequests.size(); i++) {
            List<String> errors = EmployeeValidator.validate(employeeRequests.get(i));
            if (!errors.isEmpty()) {
                allErrors.add("Ligne " + (i + 1) + " : " + String.join(", ", errors));
            }
        }
        allErrors.addAll(EmployeeValidator.validateEmailUniqueness(employeeRequests));
        if (!allErrors.isEmpty()) {
            throw new InvalidEntityException(
                    "Batch employé invalide",
                    ErrorCodes.EMPLOYEE_NOT_VALID,
                    allErrors
            );
        }

        // 2) Vérifier doublons matricule dans le batch
        Set<String> seen = new HashSet<>();
        List<String> duplicates = employeeRequests.stream()
                .map(EmployeeRequestDto::getMatricule)
                .filter(m -> !seen.add(m))
                .distinct()
                .toList();

        if (!duplicates.isEmpty()) {
            throw new InvalidOperationException(
                    "Batch invalide : doublons de matricule : " + String.join(", ", duplicates),
                    ErrorCodes.EMPLOYEE_ALREADY_EXISTS
            );
        }

        Map<String, EmployeeRequestDto> employeeRequestsMap = employeeRequests.stream()
                .collect(Collectors.toMap(EmployeeRequestDto::getMatricule, Function.identity()));

        Set<String> matricules = employeeRequestsMap.keySet();

        Map<String, Employee> existingEmployeesMap = employeeRepository.findAllByMatriculeIn(matricules)
                .stream()
                .collect(Collectors.toMap(Employee::getMatricule, e -> e));

        Set<String> supervisorMatricules = employeeRequests.stream()
                .map(EmployeeRequestDto::getSupervisor)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, Employee> existingSupervisorsMap = supervisorMatricules.isEmpty()
                ? new HashMap<>()
                : employeeRepository.findAllByMatriculeIn(supervisorMatricules)
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

        // 2ème passe : lier superviseur si pas en DB mais présent dans le batch
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

    private void validateEmployeeRequest(EmployeeRequestDto dto) {
        List<String> errors = EmployeeValidator.validate(dto);
        if (!errors.isEmpty()) {
            log.error("EmployeeRequestDto is not valid {}", dto);
            throw new InvalidEntityException(
                    "L'employé n'est pas valide",
                    ErrorCodes.EMPLOYEE_NOT_VALID,
                    errors
            );
        }
    }

    private User getUserFromPrincipal(Principal connectedUser) {
        if (!(connectedUser instanceof UsernamePasswordAuthenticationToken token)) {
            throw new InvalidOperationException(
                    "Principal invalide",
                    ErrorCodes.UNKNOWN_CONTEXT
            );
        }

        Object principal = token.getPrincipal();
        if (!(principal instanceof User user)) {
            throw new InvalidOperationException(
                    "Principal n'est pas un utilisateur",
                    ErrorCodes.UNKNOWN_CONTEXT
            );
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
                        .orElseThrow(() -> new EntityNotFoundException(
                                "Superviseur non trouvé (matricule=" + employeeRequest.getSupervisor() + ")",
                                ErrorCodes.EMPLOYEE_NOT_FOUND
                        ));
            }
        }
        employee.setMatricule(employeeRequest.getMatricule());
        employee.setCivility(employeeRequest.getCivility());
        employee.setFullName(employeeRequest.getFullName());
        employee.setHireDate(employeeRequest.getHireDate());
        employee.setHasBankDomiciliation(employeeRequest.isHasBankDomiciliation());
        employee.setEmail(employeeRequest.getEmail());
        employee.setDepartment(department);
        employee.setJobTitle(jobTitle);
        employee.setProductionLine(productionLine);
        employee.setShift(shift);
        employee.setEmploymentType(employmentType);
        employee.setSupervisor(supervisor);
        employee.setDepartureDate(employeeRequest.getDepartureDate());
        employee.setHasLeftCompany(employeeRequest.getDepartureDate() != null);
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

    // =========================
    // FREE / BUSY
    // =========================

    @Transactional
    public void markOperatorsAsFree(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            throw new InvalidOperationException("Employee ids list must not be empty", ErrorCodes.INVALID_INPUT);
        }

        List<Employee> employees = employeeRepository.findAllById(employeeIds);

        if (employees.size() != employeeIds.size()) {
            throw new EntityNotFoundException("Un ou plusieurs employés introuvables", ErrorCodes.EMPLOYEE_NOT_FOUND);
        }

        List<Long> formerEmployeeIds = employees.stream()
                .filter(this::hasLeftCompany)
                .map(Employee::getId)
                .toList();

        if (!formerEmployeeIds.isEmpty()) {
            throw new InvalidOperationException(
                    "Impossible de marquer FREE des employÃ©s ayant quittÃ© la sociÃ©tÃ© : " + formerEmployeeIds,
                    ErrorCodes.INVALID_INPUT
            );
        }

        employees.forEach(employee -> employee.setFree(true));
        employeeRepository.saveAll(employees);
    }

    @Transactional
    public void markOperatorsAsBusy(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            throw new InvalidOperationException("Employee ids list must not be empty", ErrorCodes.INVALID_INPUT);
        }

        List<Employee> employees = employeeRepository.findAllById(employeeIds);

        if (employees.size() != employeeIds.size()) {
            throw new EntityNotFoundException("Un ou plusieurs employés introuvables", ErrorCodes.EMPLOYEE_NOT_FOUND);
        }

        List<Long> formerEmployeeIds = employees.stream()
                .filter(this::hasLeftCompany)
                .map(Employee::getId)
                .toList();

        if (!formerEmployeeIds.isEmpty()) {
            throw new InvalidOperationException(
                    "Impossible de modifier le statut d'employÃ©s ayant quittÃ© la sociÃ©tÃ© : " + formerEmployeeIds,
                    ErrorCodes.INVALID_INPUT
            );
        }

        employees.forEach(employee -> employee.setFree(false));
        employeeRepository.saveAll(employees);
    }

    @Transactional(readOnly = true)
    public List<Employee> findFreeEmployees() {
        return employeeRepository.findFreeOperators();
    }

    @Transactional(readOnly = true)
    public List<Employee> findFreeEmployeesForCurrentSupervisor(Principal connectedUser) {
        User user = getUserFromPrincipal(connectedUser);

        if (user.getRole() != SUPERVISOR) {
            return employeeRepository.findFreeOperators();
        }

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
    public List<Employee> findMyOperatorsEligibleForFreeToday(
            Principal connectedUser,
            LocalDate day,
            java.time.LocalTime start,
            java.time.LocalTime end
    ) {
        User user = getUserFromPrincipal(connectedUser);

        if (user.getRole() != SUPERVISOR) {
            throw new AccessDeniedException("Only SUPERVISOR");
        }

        if (day == null || start == null || end == null) {
            throw new InvalidOperationException("day/start/end sont obligatoires", ErrorCodes.INVALID_INPUT);
        }

        if (end.isBefore(start)) {
            throw new InvalidOperationException("L'heure de fin doit être après l'heure de début", ErrorCodes.INVALID_INPUT);
        }

        String supervisorMatricule = user.getUsername();
        return employeeRepository.findMyOperatorsAvailableForDay(supervisorMatricule, day, start, end);
    }

    @Transactional(readOnly = true)
    public List<SupervisorDto> findAllSupervisors() {
        return employeeRepository.findAllSupervisors();
    }

    public List<Employee> findAvailableOperators(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new InvalidOperationException("startDate et endDate sont obligatoires", ErrorCodes.INVALID_INPUT);
        }
        if (endDate.isBefore(startDate)) {
            throw new InvalidOperationException("End date must be after start date", ErrorCodes.INVALID_INPUT);
        }
        return employeeRepository.findAvailableOperators(startDate, endDate);
    }
    @Transactional(readOnly = true)
    public EmployeeStatsDto getEmployeeStats(Principal connectedUser) {
        User user = getUserFromPrincipal(connectedUser);

        String supervisorMatricule = (user.getRole() == SUPERVISOR)
                ? user.getUsername()
                : null;

        long totalEmployees = employeeRepository.countTotalEmployees(supervisorMatricule);
        long currentEmployees = employeeRepository.countCurrentEmployees(supervisorMatricule);
        long formerEmployees = employeeRepository.countFormerEmployees(supervisorMatricule);

        return EmployeeStatsDto.builder()
                .totalEmployees(totalEmployees)
                .currentEmployees(currentEmployees)
                .formerEmployees(formerEmployees)
                .build();
    }

    private boolean hasLeftCompany(Employee employee) {
        return employee != null
                && (Boolean.TRUE.equals(employee.getHasLeftCompany()) || employee.getDepartureDate() != null);
    }
}
