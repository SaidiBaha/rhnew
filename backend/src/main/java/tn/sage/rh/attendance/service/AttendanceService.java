package tn.sage.rh.attendance.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.mapstruct.factory.Mappers;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.attendance.dto.AttendanceDto;
import tn.sage.rh.attendance.dto.EmployeeAttendanceDto;
import tn.sage.rh.attendance.dto.SaveAttendanceInputDto;
import tn.sage.rh.attendance.entity.AbsenceReason;
import tn.sage.rh.attendance.entity.Attendance;
import tn.sage.rh.attendance.mapper.AttendanceMapper;
import tn.sage.rh.attendance.repository.AttendanceRepository;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeMapper;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.user.User;

import java.security.Principal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

import static tn.sage.rh.user.UserRole.SUPERVISOR;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final AbsenceReasonService absenceReasonService;
    private final EmployeeRepository employeeRepository;
    private final AttendanceMapper attendanceMapper = Mappers.getMapper(AttendanceMapper.class);
    private final EmployeeMapper employeeMapper = Mappers.getMapper(EmployeeMapper.class);

    @Transactional
    public void batchSave(List<SaveAttendanceInputDto> attendanceInputs) {
        if (attendanceInputs.isEmpty()) return;

        Set<String> employeeMatricules = attendanceInputs.stream()
                .map(SaveAttendanceInputDto::getMatricule)
                .collect(Collectors.toSet());

        LocalDate minDate = attendanceInputs.stream()
                .map(SaveAttendanceInputDto::getDate)
                .min(LocalDate::compareTo).orElseThrow();

        LocalDate maxDate = attendanceInputs.stream()
                .map(SaveAttendanceInputDto::getDate)
                .max(LocalDate::compareTo).orElseThrow();

        List<Attendance> existingAttendances = attendanceRepository
                .findAllByDateBetweenAndEmployee_MatriculeIn(minDate, maxDate, employeeMatricules);

        Map<String, Attendance> attendanceMap = existingAttendances.stream()
                .collect(Collectors.toMap(
                        a -> generateAttendanceKey(a.getEmployee().getMatricule(), a.getDate()),
                        a -> a
                ));

        Map<String, AbsenceReason> absenceReasonMap = new HashMap<>();

        Map<String, Employee> employeeMap = employeeRepository
                .findAllByMatriculeIn(employeeMatricules)
                .stream()
                .collect(Collectors.toMap(Employee::getMatricule, e -> e));

        // ✅ Map pour dédupliquer les entrées de l'input lui-même
        Map<String, Attendance> toSaveMap = new LinkedHashMap<>();

        for (SaveAttendanceInputDto attendanceInput : attendanceInputs) {
            String key = generateAttendanceKey(attendanceInput.getMatricule(), attendanceInput.getDate());

            Attendance attendance = attendanceMap.getOrDefault(key, new Attendance());

            if (attendance.getId() == 0) {
                Employee employee = employeeMap.get(attendanceInput.getMatricule());
                if (employee == null) {
                    throw new EntityNotFoundException(
                            "Employee with matricule: " + attendanceInput.getMatricule() + " not found");
                }
                attendance.setEmployee(employee);
            }

            attendance.setDate(attendanceInput.getDate());
            attendance.setClockIn(attendanceInput.getClockIn());
            attendance.setClockOut(attendanceInput.getClockOut());
            attendance.setTotalAttendance(parseDuration(attendanceInput.getTotalAttendance()));
            attendance.setOvertime(parseDuration(attendanceInput.getOvertime()));

            if (attendanceInput.getAbsenceReason() != null) {
                AbsenceReason absenceReason = absenceReasonMap.computeIfAbsent(
                        attendanceInput.getAbsenceReason(),
                        absenceReasonService::findOrSave
                );
                attendance.setAbsenceReason(absenceReason);
            } else {
                attendance.setAbsenceReason(null);
            }

            // ✅ Remplace si doublon dans l'input (dernière valeur gagne)
            toSaveMap.put(key, attendance);
        }

        attendanceRepository.saveAll(new ArrayList<>(toSaveMap.values()));
    }

    @Transactional
    public void saveAll(List<SaveAttendanceInputDto> attendanceInputs) {

        int batchSize = 2000;

        for (int i = 0; i < attendanceInputs.size(); i += batchSize) {

            List<SaveAttendanceInputDto> batch = attendanceInputs
                    .subList(i, Math.min(i + batchSize, attendanceInputs.size()));

            batchSave(batch);
        }

    }

    @Transactional(readOnly = true)
    public List<EmployeeAttendanceDto> findAllByCurrentMonth(Principal connectedUser) {
        User user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();

        YearMonth yearMonth = YearMonth.now();
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        List<Attendance> attendances;

        if (user.getRole() == SUPERVISOR) {
            attendances = attendanceRepository.findAllByDateBetweenAndSupervisor(startDate, endDate, user.getUsername());
        } else {
            attendances = attendanceRepository.findAllByDateBetween(startDate, endDate);
        }

        Map<Employee, List<Attendance>> groupedByEmployee = attendances.stream()
                .collect(Collectors.groupingBy(Attendance::getEmployee));

        return groupedByEmployee.entrySet().stream()
                .map(entry -> {
                    Employee employee = entry.getKey();
                    List<Attendance> employeeAttendances = entry.getValue();

                    return EmployeeAttendanceDto.builder()
                            .employee(employeeMapper.toMinimalDTO(employee))
                            .attendance(attendanceMapper.toDto(employeeAttendances))
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<Long, AttendanceDto> findAllByCurrentMonthAndEmployeeIn(List<Employee> employees) {
        if (employees.isEmpty()) {
            return Collections.emptyMap();
        }

        YearMonth currentMonth = YearMonth.now(ZoneId.of("Africa/Tunis"));
        LocalDate startDate = currentMonth.atDay(1);
        LocalDate endDate = currentMonth.atEndOfMonth();

        List<Attendance> attendances = attendanceRepository.findAllByDateBetweenAndEmployeeIn(
                startDate, endDate, employees
        );

        Map<Long, List<Attendance>> groupedById = attendances.stream()
                .collect(Collectors.groupingBy(a -> a.getEmployee().getId()));

        Map<Long, AttendanceDto> result = new HashMap<>();
        for (Employee employee : employees) {
            List<Attendance> employeeAttendances = groupedById.getOrDefault(employee.getId(), Collections.emptyList());
            result.put(employee.getId(), attendanceMapper.toDto(employeeAttendances));
        }

        return result;
    }

    private Duration parseDuration(String duration) {
        if (duration == null || !duration.contains(":")) return Duration.ZERO;

        long hours = Long.parseLong(duration.split(":")[0]);
        long minutes = Long.parseLong(duration.split(":")[1]);
        return Duration.ofHours(hours).plusMinutes(minutes);
    }

    private String generateAttendanceKey(String matricule, LocalDate date) {
        return matricule + ":" + date.toString();
    }

}