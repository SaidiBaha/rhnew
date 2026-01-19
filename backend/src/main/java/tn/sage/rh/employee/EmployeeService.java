package tn.sage.rh.employee;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.employee.dto.EmployeeRequestDto;
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

    @Transactional
    public void save(EmployeeRequestDto employeeRequest) {
        employeeRepository
                .findByMatricule(employeeRequest.getMatricule())
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
        Employee employee = employeeRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Employee not found for this matricule."));

        setEmployeeFromRequestDTO(employee, employeeRequest, null);

        employeeRepository.save(employee);
    }

    @Transactional
    public void delete(Long id) {
        Employee employee = employeeRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Employee not found for this matricule."));

        if (employee.getOperators() != null && !employee.getOperators().isEmpty()) {
            employee.getOperators().forEach(operator -> operator.setSupervisor(null));
        }

        employee.setDeleted(true);
        employeeRepository.save(employee);
    }

    public List<Employee> findAll(Principal connectedUser) {
        User user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();

        if (user.getRole() == SUPERVISOR) {
            return employeeRepository.findAllBySupervisor(user.getUsername());
        }

        return employeeRepository.findAll();
    }
    public Optional<Employee> findByIdOrMatricule(Long id, String matricule) {
        if (id != null) {
            return employeeRepository.findById(id);
        }

        if (matricule != null) {
            return employeeRepository.findByMatricule(matricule);
        }

        throw new IllegalArgumentException("Employee must have either an id or a matricule.");
    }

    @Transactional
    public void batchSave(List<EmployeeRequestDto> employeeRequests) {
        Map<String, EmployeeRequestDto> employeeRequestsMap = employeeRequests
                .stream()
                .collect(Collectors
                        .toMap(EmployeeRequestDto::getMatricule,
                                r -> r, (r1, r2) -> {
                                    throw new IllegalStateException("Duplicate matricule in batch request: " + r1.getMatricule());
                                }));

        Set<String> matricules = employeeRequestsMap.keySet();

        Map<String, Employee> existingEmployeesMap = employeeRepository
                .findAllByMatriculeIn(matricules)
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
                if (supervisor != null) {
                    employee.setSupervisor(supervisor);
                }
            }

            processedEmployees.put(employeeRequest.getMatricule(), employee);
        }


        for (EmployeeRequestDto employeeRequest : employeeRequests) {
            Employee employee = processedEmployees.get(employeeRequest.getMatricule());

            if (employee.getSupervisor() == null && employeeRequest.getSupervisor() != null) {
                Employee supervisor = processedEmployees.get(employeeRequest.getSupervisor());
                if (supervisor != null) {
                    employee.setSupervisor(supervisor);
                }
            }
        }

        List<Employee> savedEmployees = employeeRepository.saveAll(processedEmployees.values());

        eventPublisher.publishEvent(new EmployeeBatchSaveEvent(savedEmployees));

    }

    public boolean isHireDateBeforeCurrentMonth(LocalDate hireDate) {
        if (hireDate == null) {
            return false;
        }

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
                        .orElseThrow(() -> new EntityNotFoundException("Supervisor not found."));
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
                .map(EmployeeRequestDto::getJobTitle).filter(Objects::nonNull).distinct()
                .collect(Collectors.toMap(Function.identity(), jobTitleService::findOrCreateJobTitle));

        context.productionLines = requests.stream()
                .map(EmployeeRequestDto::getProductionLine).filter(Objects::nonNull).distinct()
                .collect(Collectors.toMap(Function.identity(), productionLineService::findOrCreateProductionLine));

        context.shifts = requests.stream()
                .map(EmployeeRequestDto::getShift).filter(Objects::nonNull).distinct()
                .collect(Collectors.toMap(Function.identity(), shiftService::findOrCreateShift));

        context.employmentTypes = requests.stream()
                .map(EmployeeRequestDto::getEmploymentType).filter(Objects::nonNull).distinct()
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
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("startDate and endDate are required");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date must be after start date");
        }
        return employeeRepository.findAvailableOperators(startDate, endDate);
    }

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



}