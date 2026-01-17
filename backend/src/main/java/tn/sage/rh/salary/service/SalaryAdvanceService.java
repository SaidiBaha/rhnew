package tn.sage.rh.salary.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.mapstruct.factory.Mappers;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.attendance.dto.AttendanceDto;
import tn.sage.rh.attendance.service.AttendanceService;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.employee.EmployeeService;
import tn.sage.rh.salary.dto.SalaryAdvanceDto;
import tn.sage.rh.salary.dto.SalaryAdvanceRequestDto;
import tn.sage.rh.salary.entity.SalaryAdvance;
import tn.sage.rh.salary.entity.SalaryAdvanceDeadline;
import tn.sage.rh.salary.mapper.SalaryAdvanceMapper;
import tn.sage.rh.salary.repository.SalaryAdvanceDeadlineRepository;
import tn.sage.rh.salary.repository.SalaryAdvanceRepository;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserService;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static tn.sage.rh.user.UserRole.ADMIN;
import static tn.sage.rh.user.UserRole.SUPERVISOR;

@Service
@RequiredArgsConstructor
public class SalaryAdvanceService {
    private final SalaryAdvanceRepository salaryAdvanceRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeService employeeService;
    private final UserService userService;
    private final SalaryAdvanceDeadlineRepository salaryAdvanceDeadlineRepository;
    private final AttendanceService attendanceService;
    private final SalaryAdvanceMapper salaryAdvanceMapper = Mappers.getMapper(SalaryAdvanceMapper.class);

    public List<SalaryAdvanceDto> findAll(Principal connectedUser) {
        User user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();

        List<SalaryAdvance> salaryAdvances;

        if (user.getRole() == ADMIN) {
            salaryAdvances = salaryAdvanceRepository.findAllByMonthAndYear(
                    getCurrentYearMonth().getMonthValue(),
                    getCurrentYearMonth().getYear()
            );
        } else {
            salaryAdvances = salaryAdvanceRepository.findAllBySupervisorAndMonthAndYear(
                    user.getEmployee().getId(),
                    getCurrentYearMonth().getMonthValue(),
                    getCurrentYearMonth().getYear()
            );
        }

        if (salaryAdvances.isEmpty()) {
            return Collections.emptyList();
        }

        List<Employee> employees = salaryAdvances
                .stream()
                .map(SalaryAdvance::getEmployee)
                .toList();

        Map<Long, AttendanceDto> attendanceMap = attendanceService.findAllByCurrentMonthAndEmployeeIn(employees);

        return salaryAdvances.stream()
                .map(salaryAdvance -> {
                    SalaryAdvanceDto dto = salaryAdvanceMapper.toDTO(salaryAdvance);

                    AttendanceDto attendance = attendanceMap.get(salaryAdvance.getEmployee().getId());
                    dto.getEmployee().setAttendance(attendance);

                    return dto;
                })
                .toList();
    }

    @Scheduled(cron = "0 0 0 1 * *")
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedSalaryAdvances() {
        List<Employee> employees = employeeRepository.findAll();

        int currentMonth = getCurrentYearMonth().getMonthValue();
        int currentYear = getCurrentYearMonth().getYear();

        Set<Long> employeeIdsWithSalaryAdvance = salaryAdvanceRepository.findEmployeeIdsByMonthAndYear(currentMonth, currentYear);

        List<SalaryAdvance> salaryAdvances = employees
                .stream()
                .filter(employee -> !employeeIdsWithSalaryAdvance.contains(employee.getId()) &&
                        employeeService.isHireDateBeforeCurrentMonth(employee.getHireDate())
                )
                .map(employee -> SalaryAdvance.builder()
                        .month(currentMonth)
                        .year(currentYear)
                        .employee(employee)
                        .amount(BigDecimal.ZERO)
                        .build()).toList();

        if (!salaryAdvances.isEmpty()) {
            salaryAdvanceRepository.saveAll(salaryAdvances);
        }
    }

    @Transactional
    public void create(Employee employee) {
        if (!employeeService.isHireDateBeforeCurrentMonth(employee.getHireDate())) {
            return;
        }

        int currentMonth = getCurrentYearMonth().getMonthValue();
        int currentYear = getCurrentYearMonth().getYear();

        if (salaryAdvanceRepository.existsByMonthAndYearAndEmployee_Id(currentMonth, currentYear, employee.getId())) {
            return;
        }

        SalaryAdvance salaryAdvance = SalaryAdvance.builder()
                .month(currentMonth)
                .year(currentYear)
                .employee(employee)
                .amount(BigDecimal.ZERO).build();

        salaryAdvanceRepository.save(salaryAdvance);
    }

    @Transactional
    public void batchCreate(List<Employee> employees) {
        if (employees.isEmpty()) return;

        List<Employee> eligibleEmployees = employees.stream()
                .filter(e -> employeeService.isHireDateBeforeCurrentMonth(e.getHireDate()))
                .toList();

        if (eligibleEmployees.isEmpty()) return;

        YearMonth yearMonth = getCurrentYearMonth();

        Set<Long> employeeIdsWithSalaryAdvances = salaryAdvanceRepository
                .findEmployeeIdsByMonthAndYearAndEmployee_IdIn(
                        yearMonth.getMonthValue(),
                        yearMonth.getYear(),
                        eligibleEmployees.stream()
                                .map(Employee::getId)
                                .toList());

        List<SalaryAdvance> salaryAdvances = eligibleEmployees.stream()
                .filter(e -> !employeeIdsWithSalaryAdvances.contains(e.getId()))
                .map(employee -> SalaryAdvance.builder()
                        .month(yearMonth.getMonthValue())
                        .year(yearMonth.getYear())
                        .employee(employee)
                        .amount(BigDecimal.ZERO)
                        .build())
                .toList();

        if (!salaryAdvances.isEmpty()) {
            salaryAdvanceRepository.saveAll(salaryAdvances);
        }

    }

    @Transactional
    public void batchUpdate(Principal connectedUser, List<SalaryAdvanceRequestDto> salaryAdvanceRequests) {
        if (salaryAdvanceRequests.isEmpty()) {
            return;
        }

        User user = userService.getManagedUser(connectedUser);

        if (user.getRole() == SUPERVISOR) {
            SalaryAdvanceDeadline salaryAdvanceDeadline = salaryAdvanceDeadlineRepository.
                    findByMonthAndYear(getCurrentYearMonth().getMonthValue(), getCurrentYearMonth().getYear())
                    .orElse(null);

            if (salaryAdvanceDeadline != null) {
                if (!salaryAdvanceDeadline.getDeadline().isAfter(LocalDate.now())) {
                    throw new IllegalStateException("Deadline exceeded.");
                }
            }
        }

        List<Long> salaryAdvanceRequestIds = salaryAdvanceRequests
                .stream()
                .map(SalaryAdvanceRequestDto::getId).toList();

        Map<Long, SalaryAdvance> salaryAdvanceMap = salaryAdvanceRepository
                .findAllById(salaryAdvanceRequestIds)
                .stream()
                .collect(Collectors.toMap(SalaryAdvance::getId, salaryAdvance -> salaryAdvance));

        List<Employee> employees = salaryAdvanceMap
                .values()
                .stream()
                .map(SalaryAdvance::getEmployee).toList();

        Map<Long, AttendanceDto> attendanceMap = attendanceService.findAllByCurrentMonthAndEmployeeIn(employees);

        for (SalaryAdvanceRequestDto salaryAdvanceRequest : salaryAdvanceRequests) {
            SalaryAdvance salaryAdvance = salaryAdvanceMap.get(salaryAdvanceRequest.getId());

            if (salaryAdvance == null) {
                throw new EntityNotFoundException("Salary Advance with id " + salaryAdvanceRequest.getId() + " not found");
            }

            Employee employee = salaryAdvance.getEmployee();

            userService.validateAuthorization(user, employee.getMatricule());

            AttendanceDto attendance = attendanceMap.get(employee.getId());

            if (attendance == null) {
                throw new EntityNotFoundException("Attendance for employee with id " + employee.getId() + " not found");
            }

            boolean isEligible = isEmployeeEligible(employee, attendance) || (user.getRole() == ADMIN);

            if (isEligible) {
                salaryAdvance.setAmount(salaryAdvanceRequest.getAmount());
                salaryAdvance.setComment(salaryAdvanceRequest.getComment());
            }
        }
    }

    private YearMonth getCurrentYearMonth() {
        return YearMonth.now(ZoneId.of("Africa/Tunis"));
    }

    private boolean isEmployeeEligible(Employee employee, AttendanceDto attendance) {
        if (employee.isHasBankDomiciliation()) {
            return false;
        }

        if (attendance.getAbsenceReasons()
                .stream()
                .anyMatch(ar -> List.of("MALADIE L-D", "MATERNITÉ").contains(ar.getAbsenceReason()))) {
            return false;
        }

        long totalAttendanceHours = Long.parseLong(attendance.getTotalAttendance().split(":")[0]);

        if (totalAttendanceHours < 40) {
            return false;
        }

        return true;
    }
}
