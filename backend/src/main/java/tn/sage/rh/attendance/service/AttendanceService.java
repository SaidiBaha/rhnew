package tn.sage.rh.attendance.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.mapstruct.factory.Mappers;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.attendance.audit.PresenceAuditLogService;
import tn.sage.rh.attendance.dto.AttendanceDto;
import tn.sage.rh.attendance.dto.DailyAttendanceDto;
import tn.sage.rh.attendance.dto.EmployeeAttendanceDto;
import tn.sage.rh.attendance.dto.HistoryEmployeeSummaryDto;
import tn.sage.rh.attendance.dto.HistoryResponseDto;
import tn.sage.rh.attendance.dto.ManualPresenceEntryDto;
import tn.sage.rh.attendance.dto.ManualPresenceInputDto;
import tn.sage.rh.attendance.dto.SaveAttendanceInputDto;
import tn.sage.rh.attendance.dto.TodayImportStatusDto;
import tn.sage.rh.attendance.dto.UpdateAppeleInputDto;
import tn.sage.rh.attendance.dto.UpdateAttendanceInputDto;
import tn.sage.rh.attendance.entity.AbsenceReason;
import tn.sage.rh.attendance.entity.Attendance;
import tn.sage.rh.attendance.mapper.AttendanceMapper;
import tn.sage.rh.attendance.repository.AttendanceRepository;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeMapper;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.salary.service.SupervisorAdvanceTrackingService;
import tn.sage.rh.user.User;

import java.security.Principal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import static tn.sage.rh.user.UserRole.SUPERVISOR;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final AbsenceReasonService absenceReasonService;
    private final EmployeeRepository employeeRepository;
    private final PresenceAuditLogService auditLogService;
    @Lazy
    private final SupervisorAdvanceTrackingService supervisorAdvanceTrackingService;
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
            attendance.setHoraire(attendanceInput.getHoraire());
            attendance.setDebut(parseLocalTime(attendanceInput.getDebut()));
            attendance.setFin(parseLocalTime(attendanceInput.getFin()));
            attendance.setSource("XLSX_IMPORT");

            if (attendanceInput.getAbsenceReason() != null) {
                AbsenceReason absenceReason = absenceReasonMap.computeIfAbsent(
                        attendanceInput.getAbsenceReason(),
                        absenceReasonService::findOrSave
                );
                attendance.setAbsenceReason(absenceReason);
            } else {
                attendance.setAbsenceReason(null);
            }

            toSaveMap.put(key, attendance);
        }

        attendanceRepository.saveAll(new ArrayList<>(toSaveMap.values()));
    }

    /**
     * Import XLSX : sauvegarde par batch de 2000 lignes, puis déclenche
     * la création du tracking superviseurs et l'envoi des notifications.
     */
    @Transactional
    public void saveAll(List<SaveAttendanceInputDto> attendanceInputs,
                        Long importedByUserId,
                        String fichierNom) {
        saveAll(attendanceInputs, importedByUserId, fichierNom, null);
    }

    @Transactional
    public void saveAll(List<SaveAttendanceInputDto> attendanceInputs,
                        Long importedByUserId,
                        String fichierNom,
                        String ipAddress) {
        if (attendanceInputs.isEmpty()) return;

        int batchSize = 2000;
        for (int i = 0; i < attendanceInputs.size(); i += batchSize) {
            List<SaveAttendanceInputDto> batch = attendanceInputs
                    .subList(i, Math.min(i + batchSize, attendanceInputs.size()));
            batchSave(batch);
        }

        LocalDate importDate = attendanceInputs.stream()
                .map(SaveAttendanceInputDto::getDate)
                .filter(d -> d != null)
                .min(LocalDate::compareTo)
                .orElse(LocalDate.now(ZoneId.of("Africa/Tunis")));

        // Log d'audit : une entrée agrégée pour l'import XLSX (employeeId=null)
        if (importedByUserId != null) {
            final int total = attendanceInputs.size();
            final String ip = ipAddress;
            try {
                auditLogService.logCreation(importedByUserId, null, "PRESENCE_ABSENCE", ip,
                        "Import XLSX : " + total + " enregistrement(s) importé(s)"
                        + (fichierNom != null ? " — fichier : " + fichierNom : ""));
            } catch (Exception e) {
                log.warn("Audit log write failed for XLSX import: {}", e.getMessage());
            }
        }

        try {
            supervisorAdvanceTrackingService.onAttendanceImported(
                    importedByUserId, importDate, fichierNom, attendanceInputs.size());
        } catch (Exception e) {
            log.warn("Erreur lors du déclenchement du tracking superviseurs: {}", e.getMessage());
        }
    }

    /** Compatibilité ascendante */
    @Transactional
    public void saveAll(List<SaveAttendanceInputDto> attendanceInputs) {
        saveAll(attendanceInputs, null, null, null);
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

    // =========================
    // MODULE PRÉSENCE / ABSENCES
    // =========================

    @Transactional(readOnly = true)
    public List<DailyAttendanceDto> findAllByToday(Principal connectedUser) {
        User user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();
        LocalDate today = LocalDate.now(ZoneId.of("Africa/Tunis"));

        List<Attendance> attendances;
        if (user.getRole() == SUPERVISOR) {
            attendances = attendanceRepository.findAllByDateAndSupervisor(today, user.getUsername());
        } else {
            attendances = attendanceRepository.findAllByDate(today);
        }

        return attendances.stream().map(this::toDailyDto).toList();
    }

    /**
     * Met à jour clockIn, clockOut et absenceReason.
     * Logue les champs qui ont changé (un log par champ modifié).
     */
    @Transactional
    public void updateAttendance(Long id, UpdateAttendanceInputDto input,
                                 Principal connectedUser, String ipAddress, String module) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Attendance not found (id=" + id + ")"));

        User performer = resolveUser(connectedUser);
        Employee employee = attendance.getEmployee();
        String effectiveModule = (module != null && !module.isBlank()) ? module : "PRESENCE_ABSENCE";

        // Capture old values before mutation
        String oldClockIn   = formatTime(attendance.getClockIn());
        String oldClockOut  = formatTime(attendance.getClockOut());
        String oldMotif     = attendance.getAbsenceReason() != null
                ? attendance.getAbsenceReason().getReason() : null;

        // Apply changes
        attendance.setClockIn(parseLocalTime(input.getClockIn()));
        attendance.setClockOut(parseLocalTime(input.getClockOut()));

        String newMotif;
        if (input.getAbsenceReason() != null && !input.getAbsenceReason().isBlank()) {
            AbsenceReason ar = absenceReasonService.findOrSave(input.getAbsenceReason().trim().toUpperCase());
            attendance.setAbsenceReason(ar);
            newMotif = ar.getReason();
        } else {
            attendance.setAbsenceReason(null);
            newMotif = null;
        }

        attendanceRepository.save(attendance);

        // Audit — log each changed field
        if (performer != null) {
            Long performerId = performer.getId();
            Long employeeId  = employee != null ? employee.getId() : null;
            String empLabel  = employee != null ? employee.getFullName() + " (" + employee.getMatricule() + ")" : "?";

            String newClockIn  = input.getClockIn();
            String newClockOut = input.getClockOut();

            try {
                if (!Objects.equals(oldClockIn, newClockIn)) {
                    auditLogService.logModification(performerId, employeeId, effectiveModule,
                            "Heure d'entrée", oldClockIn, newClockIn, ipAddress,
                            "Heure d'entrée modifiée pour " + empLabel
                                    + " : " + nvl(oldClockIn) + " → " + nvl(newClockIn));
                }
                if (!Objects.equals(oldClockOut, newClockOut)) {
                    auditLogService.logModification(performerId, employeeId, effectiveModule,
                            "Heure de sortie", oldClockOut, newClockOut, ipAddress,
                            "Heure de sortie modifiée pour " + empLabel
                                    + " : " + nvl(oldClockOut) + " → " + nvl(newClockOut));
                }
                if (!Objects.equals(oldMotif, newMotif)) {
                    auditLogService.logModification(performerId, employeeId, effectiveModule,
                            "Motif", oldMotif, newMotif, ipAddress,
                            "Motif modifié pour " + empLabel
                                    + " : " + nvl(oldMotif) + " → " + nvl(newMotif));
                }
            } catch (Exception e) {
                log.warn("Audit log write failed for attendance {}: {}", id, e.getMessage());
            }
        }
    }

    // =========================
    // MODULE HISTORIQUE
    // =========================

    @Transactional(readOnly = true)
    public HistoryResponseDto findHistory(Principal connectedUser, LocalDate dateFrom, LocalDate dateTo) {
        User user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();

        List<Attendance> attendances;
        if (user.getRole() == SUPERVISOR) {
            attendances = attendanceRepository.findAllForHistoryBySupervisor(user.getUsername(), dateFrom, dateTo);
        } else {
            attendances = attendanceRepository.findAllForHistory(dateFrom, dateTo);
        }

        Map<Employee, List<Attendance>> grouped = attendances.stream()
                .collect(Collectors.groupingBy(Attendance::getEmployee));

        List<HistoryEmployeeSummaryDto> summaries = grouped.entrySet().stream()
                .map(entry -> {
                    Employee emp = entry.getKey();
                    List<Attendance> records = entry.getValue();
                    int present = (int) records.stream().filter(this::isPresent).count();
                    int absent = records.size() - present;
                    return HistoryEmployeeSummaryDto.builder()
                            .matricule(emp.getMatricule())
                            .fullName(emp.getFullName())
                            .department(emp.getDepartment() != null ? emp.getDepartment().getName() : null)
                            .presentDays(present)
                            .absentDays(absent)
                            .build();
                })
                .sorted(Comparator.comparing(HistoryEmployeeSummaryDto::getFullName))
                .toList();

        int totalPresent = summaries.stream().mapToInt(HistoryEmployeeSummaryDto::getPresentDays).sum();
        int totalAbsent  = summaries.stream().mapToInt(HistoryEmployeeSummaryDto::getAbsentDays).sum();
        int total = totalPresent + totalAbsent;
        double rate = total == 0 ? 0.0 : Math.round(totalPresent * 1000.0 / total) / 10.0;

        return HistoryResponseDto.builder()
                .totalPresent(totalPresent)
                .totalAbsent(totalAbsent)
                .presenceRate(rate)
                .employees(summaries)
                .build();
    }

    @Transactional(readOnly = true)
    public List<DailyAttendanceDto> findEmployeeHistory(Principal connectedUser, String matricule, LocalDate dateFrom, LocalDate dateTo) {
        User user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();

        List<Attendance> attendances;
        if (user.getRole() == SUPERVISOR) {
            attendances = attendanceRepository.findByMatriculeAndDateRangeForSupervisor(
                    matricule, user.getUsername(), dateFrom, dateTo);
        } else {
            attendances = attendanceRepository.findByMatriculeAndDateRange(matricule, dateFrom, dateTo);
        }

        return attendances.stream().map(this::toDailyDto).toList();
    }

    private boolean isPresent(Attendance a) {
        LocalTime clockIn = a.getClockIn();
        if (clockIn == null || clockIn.equals(LocalTime.of(0, 0))) return false;
        String reason = a.getAbsenceReason() != null ? a.getAbsenceReason().getReason() : null;
        return reason == null || !reason.toUpperCase().contains("ABSENCE");
    }

    // =========================
    // SAISIE MANUELLE SUPERVISEUR
    // =========================

    @Transactional(readOnly = true)
    public TodayImportStatusDto getTodayImportStatus(Principal connectedUser) {
        User user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();
        LocalDate today = LocalDate.now(ZoneId.of("Africa/Tunis"));
        String supervisorMatricule = user.getUsername();

        long count = attendanceRepository.countByDateAndSupervisorMatricule(today, supervisorMatricule);
        if (count == 0) {
            return TodayImportStatusDto.builder().count(0).source(null).build();
        }

        boolean hasXlsx = attendanceRepository.existsXlsxImportByDateAndSupervisor(today, supervisorMatricule);
        String source = hasXlsx ? "XLSX_IMPORT" : "MANUAL_SUPERVISOR";
        return TodayImportStatusDto.builder().count(count).source(source).build();
    }

    @Transactional
    public void saveManualEntry(Principal connectedUser, ManualPresenceInputDto input) {
        saveManualEntry(connectedUser, input, null);
    }

    @Transactional
    public void saveManualEntry(Principal connectedUser, ManualPresenceInputDto input, String ipAddress) {
        User user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();
        LocalDate today = LocalDate.now(ZoneId.of("Africa/Tunis"));

        List<Long> employeeIds = input.getEntries().stream()
                .map(ManualPresenceEntryDto::getEmployeeId)
                .toList();

        Map<Long, Employee> employeeMap = employeeRepository.findAllById(employeeIds)
                .stream()
                .collect(Collectors.toMap(Employee::getId, e -> e));

        Set<String> matricules = employeeMap.values().stream()
                .map(Employee::getMatricule)
                .collect(Collectors.toSet());

        Map<String, Attendance> existingMap = attendanceRepository
                .findAllByDateBetweenAndEmployee_MatriculeIn(today, today, matricules)
                .stream()
                .collect(Collectors.toMap(
                        a -> a.getEmployee().getMatricule(),
                        a -> a
                ));

        final String DEFAULT_ABSENCE_REASON = "ABSENCE-SAISIE-SUPERVISEUR";

        LocalTime debut = parseLocalTime(input.getDebut());
        LocalTime fin = parseLocalTime(input.getFin());

        Duration plannedDuration;
        if (fin != null && debut != null) {
            plannedDuration = fin.isBefore(debut)
                    ? Duration.ofHours(24).minus(Duration.between(fin, debut))
                    : Duration.between(debut, fin);
        } else {
            plannedDuration = Duration.ZERO;
        }

        List<Attendance> toSave = new ArrayList<>();

        for (ManualPresenceEntryDto entry : input.getEntries()) {
            Employee employee = employeeMap.get(entry.getEmployeeId());
            if (employee == null) continue;

            Attendance existing = existingMap.get(employee.getMatricule());
            boolean isNew = (existing == null);
            Attendance attendance = isNew ? new Attendance() : existing;

            if (isNew) {
                attendance.setEmployee(employee);
            }

            attendance.setDate(today);
            attendance.setHoraire(input.getHoraire());
            attendance.setDebut(debut);
            attendance.setFin(fin);
            attendance.setSource("MANUAL_SUPERVISOR");
            attendance.setCreatedBy(user.getId());

            if (entry.isPresent()) {
                attendance.setClockIn(debut);
                attendance.setClockOut(fin);
                attendance.setTotalAttendance(plannedDuration);
                attendance.setOvertime(Duration.ZERO);
                attendance.setAbsenceReason(null);
            } else {
                attendance.setClockIn(null);
                attendance.setClockOut(null);
                attendance.setTotalAttendance(Duration.ZERO);
                attendance.setOvertime(Duration.ZERO);
                String reasonLabel = (entry.getAbsenceReason() != null && !entry.getAbsenceReason().isBlank())
                        ? entry.getAbsenceReason().trim().toUpperCase()
                        : DEFAULT_ABSENCE_REASON;
                attendance.setAbsenceReason(absenceReasonService.findOrSave(reasonLabel));
            }

            toSave.add(attendance);

            // Audit log per employee
            String empLabel = employee.getFullName() + " (" + employee.getMatricule() + ")";
            String statut = entry.isPresent() ? "PRÉSENT" : "ABSENT";
            String motif  = entry.isPresent() ? null
                    : (entry.getAbsenceReason() != null && !entry.getAbsenceReason().isBlank()
                       ? entry.getAbsenceReason().trim().toUpperCase() : DEFAULT_ABSENCE_REASON);

            try {
                if (isNew) {
                    auditLogService.logCreation(user.getId(), employee.getId(), "PRESENCE_ABSENCE", ipAddress,
                            "Saisie manuelle — " + empLabel + " : " + statut
                                    + (motif != null ? " — motif : " + motif : "")
                                    + " — shift : " + input.getHoraire()
                                    + " (" + input.getDebut() + "–" + input.getFin() + ")");
                } else {
                    auditLogService.logModification(user.getId(), employee.getId(), "PRESENCE_ABSENCE",
                            "Statut", null, statut, ipAddress,
                            "Modification saisie manuelle — " + empLabel + " : " + statut
                                    + (motif != null ? " — motif : " + motif : "")
                                    + " — shift : " + input.getHoraire()
                                    + " (" + input.getDebut() + "–" + input.getFin() + ")");
                }
            } catch (Exception e) {
                log.warn("Audit log write failed for employee {}: {}", employee.getMatricule(), e.getMessage());
            }
        }

        attendanceRepository.saveAll(toSave);
    }

    // =========================
    // HELPERS
    // =========================

    private Duration parseDuration(String duration) {
        if (duration == null || !duration.contains(":")) return Duration.ZERO;

        long hours = Long.parseLong(duration.split(":")[0]);
        long minutes = Long.parseLong(duration.split(":")[1]);
        return Duration.ofHours(hours).plusMinutes(minutes);
    }

    private LocalTime parseLocalTime(String time) {
        if (time == null || !time.contains(":")) return null;
        String[] parts = time.split(":");
        return LocalTime.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
    }

    private String formatTime(LocalTime t) {
        if (t == null) return null;
        return t.format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    private DailyAttendanceDto toDailyDto(Attendance a) {
        return DailyAttendanceDto.builder()
                .id(a.getId())
                .date(a.getDate())
                .matricule(a.getEmployee().getMatricule())
                .fullName(a.getEmployee().getFullName())
                .department(a.getEmployee().getDepartment() != null
                        ? a.getEmployee().getDepartment().getName() : null)
                .horaire(a.getHoraire())
                .debut(formatTime(a.getDebut()))
                .fin(formatTime(a.getFin()))
                .clockIn(formatTime(a.getClockIn()))
                .clockOut(formatTime(a.getClockOut()))
                .absenceReason(a.getAbsenceReason() != null
                        ? a.getAbsenceReason().getReason() : null)
                .appele(a.isAppele())
                .appeleAt(a.getAppeleAt() != null
                        ? a.getAppeleAt().format(DateTimeFormatter.ofPattern("HH:mm")) : null)
                .appeleBy(a.getAppeleBy())
                .build();
    }

    @Transactional
    public DailyAttendanceDto toggleAppele(Long id, UpdateAppeleInputDto input, Principal connectedUser) {
        User user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Attendance not found (id=" + id + ")"));

        if (input.isAppele()) {
            attendance.setAppele(true);
            attendance.setAppeleAt(LocalDateTime.now(ZoneId.of("Africa/Tunis")));
            attendance.setAppeleBy(user.getId());
        } else {
            attendance.setAppele(false);
            attendance.setAppeleAt(null);
            attendance.setAppeleBy(null);
        }

        return toDailyDto(attendanceRepository.save(attendance));
    }

    private String generateAttendanceKey(String matricule, LocalDate date) {
        return matricule + ":" + date.toString();
    }

    private User resolveUser(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken token
                && token.getPrincipal() instanceof User u) {
            return u;
        }
        return null;
    }

    private static String nvl(String s) {
        return s != null ? s : "—";
    }
}
