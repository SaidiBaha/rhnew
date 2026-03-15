package tn.sage.rh.attendance.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.mapstruct.factory.Mappers;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.attendance.AttendanceValidator;
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
import tn.sage.rh.exeption.ErrorCodes;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.exeption.InvalidOperationException;
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
@Slf4j
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final AbsenceReasonService absenceReasonService;
    private final EmployeeRepository employeeRepository;
    private final AttendanceValidator attendanceValidator;

    private final AttendanceMapper attendanceMapper = Mappers.getMapper(AttendanceMapper.class);
    private final EmployeeMapper employeeMapper = Mappers.getMapper(EmployeeMapper.class);

    @Transactional
    public void batchSave(List<SaveAttendanceInputDto> attendanceInputs) {
        // Validation des entrées - version assouplie
        AttendanceValidator.ValidationResult validationResult = attendanceValidator.validateBatch(attendanceInputs);

        if (validationResult.hasErrors()) {
            log.error("Batch attendance validation failed with {} errors", validationResult.getAllErrors().size());
            // Logguer les premières erreurs pour faciliter le debugging
            validationResult.getAllErrors().stream().limit(10).forEach(error -> log.error("Validation error: {}", error));

            throw new InvalidEntityException(
                    "Les données de présence sont invalides. " + validationResult.getAllErrors().size() + " erreurs détectées.",
                    ErrorCodes.ATTENDANCE_NOT_VALID,
                    validationResult.getAllErrors()
            );
        }

        if (attendanceInputs.isEmpty()) {
            log.warn("Empty attendance list received");
            return;
        }

        log.info("Processing {} attendance records", attendanceInputs.size());

        // Récupération des matricules et des dates
        Set<String> employeeMatricules = attendanceInputs.stream()
                .map(SaveAttendanceInputDto::getMatricule)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // Récupération des dates min/max
        LocalDate minDate = attendanceInputs.stream()
                .map(SaveAttendanceInputDto::getDate)
                .filter(Objects::nonNull)
                .min(LocalDate::compareTo)
                .orElse(LocalDate.now().minusMonths(1));

        LocalDate maxDate = attendanceInputs.stream()
                .map(SaveAttendanceInputDto::getDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(LocalDate.now());

        // Validation de l'existence des employés
        Map<String, Employee> employeeMap = attendanceValidator.validateEmployeesExist(employeeMatricules);

        // Filtrer les entrées avec des employés inexistants
        List<SaveAttendanceInputDto> validInputs = attendanceInputs.stream()
                .filter(input -> {
                    if (input.getMatricule() == null) return false;
                    boolean exists = employeeMap.containsKey(input.getMatricule());
                    if (!exists) {
                        log.warn("Skipping attendance for unknown employee: {}", input.getMatricule());
                    }
                    return exists;
                })
                .toList();

        if (validInputs.isEmpty()) {
            log.error("No valid attendance records to process after filtering");
            throw new InvalidOperationException(
                    "Aucune présence valide à traiter (tous les employés sont introuvables)",
                    ErrorCodes.EMPLOYEE_NOT_FOUND
            );
        }

        log.info("Processing {} valid attendance records after filtering", validInputs.size());

        // Récupération des présences existantes
        Set<String> validMatricules = validInputs.stream()
                .map(SaveAttendanceInputDto::getMatricule)
                .collect(Collectors.toSet());

        List<Attendance> existingAttendances = attendanceRepository.findAllByDateBetweenAndEmployee_MatriculeIn(
                minDate,
                maxDate,
                validMatricules);

        Map<String, Attendance> attendanceMap = existingAttendances.stream()
                .collect(Collectors.toMap(
                        a -> generateAttendanceKey(a.getEmployee().getMatricule(), a.getDate()),
                        a -> a,
                        (a1, a2) -> a1 // En cas de conflit, garder le premier
                ));

        // Cache pour les raisons d'absence
        Map<String, AbsenceReason> absenceReasonMap = new HashMap<>();

        // Préparation des nouvelles présences
        List<Attendance> attendances = new ArrayList<>();
        int skippedCount = 0;

        for (SaveAttendanceInputDto attendanceInput : validInputs) {
            try {
                String key = generateAttendanceKey(attendanceInput.getMatricule(), attendanceInput.getDate());
                Attendance attendance = attendanceMap.getOrDefault(key, new Attendance());

                boolean isNew = attendance.getId() == 0;
                if (isNew) {
                    Employee employee = employeeMap.get(attendanceInput.getMatricule());
                    attendance.setEmployee(employee);
                }

                // Mise à jour des champs (avec valeurs par défaut si null)
                attendance.setDate(attendanceInput.getDate());
                attendance.setClockIn(attendanceInput.getClockIn());
                attendance.setClockOut(attendanceInput.getClockOut());

                // Gestion sécurisée des durées
                attendance.setTotalAttendance(parseDurationSafe(attendanceInput.getTotalAttendance()));
                attendance.setOvertime(parseDurationSafe(attendanceInput.getOvertime()));

                // Gestion de la raison d'absence
                if (attendanceInput.getAbsenceReason() != null && !attendanceInput.getAbsenceReason().trim().isEmpty()) {
                    AbsenceReason absenceReason = absenceReasonMap.computeIfAbsent(
                            attendanceInput.getAbsenceReason().toUpperCase(),
                            reason -> absenceReasonService.findOrSave(reason)
                    );
                    attendance.setAbsenceReason(absenceReason);
                } else {
                    attendance.setAbsenceReason(null);
                }

                attendances.add(attendance);

            } catch (Exception e) {
                skippedCount++;
                log.error("Error processing attendance for employee {} on date {}: {}",
                        attendanceInput.getMatricule(), attendanceInput.getDate(), e.getMessage());
            }
        }

        if (attendances.isEmpty()) {
            throw new InvalidOperationException(
                    "Aucune présence n'a pu être sauvegardée",
                    ErrorCodes.BATCH_SAVE_FAILED
            );
        }

        if (skippedCount > 0) {
            log.warn("Skipped {} records due to processing errors", skippedCount);
        }

        // Sauvegarde
        attendanceRepository.saveAll(attendances);
        log.info("Successfully saved {}/{} attendances", attendances.size(), validInputs.size());
    }

    @Transactional
    public void saveAll(List<SaveAttendanceInputDto> attendanceInputs) {
        if (attendanceInputs == null || attendanceInputs.isEmpty()) {
            log.warn("Empty attendance list received");
            return;
        }

        int batchSize = 2000;
        int totalBatches = (int) Math.ceil((double) attendanceInputs.size() / batchSize);

        log.info("Starting batch save of {} attendances in {} batches", attendanceInputs.size(), totalBatches);
        int successfulBatches = 0;
        List<String> failedBatches = new ArrayList<>();

        for (int i = 0; i < attendanceInputs.size(); i += batchSize) {
            int batchNumber = (i / batchSize) + 1;
            int startIdx = i;
            int endIdx = Math.min(i + batchSize, attendanceInputs.size());

            List<SaveAttendanceInputDto> batch = attendanceInputs.subList(startIdx, endIdx);

            try {
                batchSave(new ArrayList<>(batch)); // Copie pour éviter les problèmes de modification concurrente
                successfulBatches++;
                log.debug("Batch {}/{} saved successfully", batchNumber, totalBatches);
            } catch (Exception e) {
                String errorMsg = String.format("Batch %d (lignes %d-%d) a échoué: %s",
                        batchNumber, startIdx + 1, endIdx, e.getMessage());
                log.error(errorMsg);
                failedBatches.add(errorMsg);

                // Ne pas relancer l'exception immédiatement pour permettre aux autres lots de continuer
            }
        }

        if (!failedBatches.isEmpty()) {
            log.error("{} out of {} batches failed", failedBatches.size(), totalBatches);
            if (successfulBatches == 0) {
                throw new InvalidOperationException(
                        "Tous les lots ont échoué. Erreurs: " + String.join("; ", failedBatches),
                        ErrorCodes.BATCH_SAVE_FAILED
                );
            }
            // Si certains lots ont réussi, on loggue seulement un warning
            log.warn("Partial success: {}/{} batches completed successfully", successfulBatches, totalBatches);
        }

        log.info("Batch save completed. Successful: {}/{}", successfulBatches, totalBatches);
    }

    @Transactional(readOnly = true)
    public List<EmployeeAttendanceDto> findAllByCurrentMonth(Principal connectedUser) {
        if (connectedUser == null) {
            throw new InvalidOperationException(
                    "Utilisateur non authentifié",
                    ErrorCodes.UNKNOWN_CONTEXT
            );
        }

        User user = getUserFromPrincipal(connectedUser);
        YearMonth yearMonth = YearMonth.now(ZoneId.of("Africa/Tunis"));
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        List<Attendance> attendances;

        try {
            if (user.getRole() == SUPERVISOR) {
                attendances = attendanceRepository.findAllByDateBetweenAndSupervisor(
                        startDate,
                        endDate,
                        user.getUsername()
                );
            } else {
                attendances = attendanceRepository.findAllByDateBetween(startDate, endDate);
            }
        } catch (Exception e) {
            log.error("Error fetching attendances for date range: {} to {}", startDate, endDate, e);
            throw new InvalidOperationException(
                    "Erreur lors de la récupération des présences",
                    ErrorCodes.DATABASE_ERROR
            );
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
        if (employees == null) {
            throw new InvalidOperationException(
                    "La liste des employés ne peut pas être nulle",
                    ErrorCodes.INVALID_INPUT
            );
        }

        if (employees.isEmpty()) {
            return Collections.emptyMap();
        }

        YearMonth currentMonth = YearMonth.now(ZoneId.of("Africa/Tunis"));
        LocalDate startDate = currentMonth.atDay(1);
        LocalDate endDate = currentMonth.atEndOfMonth();

        List<Attendance> attendances;
        try {
            attendances = attendanceRepository.findAllByDateBetweenAndEmployeeIn(
                    startDate,
                    endDate,
                    employees
            );
        } catch (Exception e) {
            log.error("Error fetching attendances for employees", e);
            throw new InvalidOperationException(
                    "Erreur lors de la récupération des présences",
                    ErrorCodes.DATABASE_ERROR
            );
        }

        Map<Long, List<Attendance>> groupedById = attendances.stream()
                .collect(Collectors.groupingBy(a -> a.getEmployee().getId()));

        Map<Long, AttendanceDto> result = new HashMap<>();
        for (Employee employee : employees) {
            List<Attendance> employeeAttendances = groupedById.getOrDefault(
                    employee.getId(),
                    Collections.emptyList()
            );
            result.put(employee.getId(), attendanceMapper.toDto(employeeAttendances));
        }

        return result;
    }

    // =========================
    // HELPERS
    // =========================

    private Duration parseDurationSafe(String duration) {
        if (duration == null || duration.trim().isEmpty()) {
            return Duration.ZERO;
        }

        try {
            if (!duration.contains(":")) {
                return Duration.ZERO;
            }

            String[] parts = duration.split(":");
            long hours = Long.parseLong(parts[0]);
            long minutes = Long.parseLong(parts[1]);
            return Duration.ofHours(hours).plusMinutes(minutes);
        } catch (NumberFormatException | ArrayIndexOutOfBoundsException e) {
            log.warn("Invalid duration format: '{}', using ZERO", duration);
            return Duration.ZERO;
        }
    }

    private String generateAttendanceKey(String matricule, LocalDate date) {
        return matricule + ":" + date.toString();
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
}
