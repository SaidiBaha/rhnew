package tn.sage.rh.salary.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import tn.sage.rh.exeption.EntityNotFoundException;
import tn.sage.rh.exeption.ErrorCodes;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.exeption.InvalidOperationException;
import tn.sage.rh.salary.dto.SalaryAdvanceDto;
import tn.sage.rh.salary.dto.SalaryAdvanceRequestDto;
import tn.sage.rh.salary.entity.SalaryAdvance;
import tn.sage.rh.salary.entity.SalaryAdvanceDeadline;
import tn.sage.rh.salary.mapper.SalaryAdvanceMapper;
import tn.sage.rh.salary.repository.SalaryAdvanceDeadlineRepository;
import tn.sage.rh.salary.repository.SalaryAdvanceRepository;
import tn.sage.rh.salary.validator.SalaryAdvanceValidator;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserService;

import java.math.BigDecimal;
import java.security.Principal;

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
@Slf4j
public class SalaryAdvanceService {

    private final SalaryAdvanceRepository salaryAdvanceRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeService employeeService;
    private final UserService userService;
    private final SalaryAdvanceDeadlineRepository salaryAdvanceDeadlineRepository;
    private final AttendanceService attendanceService;
    private final SalaryAdvanceValidator salaryAdvanceValidator;

    private final SalaryAdvanceMapper salaryAdvanceMapper = Mappers.getMapper(SalaryAdvanceMapper.class);

    @Transactional(readOnly = true)
    public List<SalaryAdvanceDto> findAll(Principal connectedUser) {
        if (connectedUser == null) {
            throw new InvalidOperationException(
                    "Utilisateur non authentifié",
                    ErrorCodes.UNKNOWN_CONTEXT
            );
        }

        User user = getUserFromPrincipal(connectedUser);
        YearMonth currentYearMonth = getCurrentYearMonth();
        int currentMonth = currentYearMonth.getMonthValue();
        int currentYear = currentYearMonth.getYear();

        List<SalaryAdvance> salaryAdvances;

        try {
            if (user.getRole() == ADMIN) {
                log.debug("Récupération des avances pour ADMIN");
                salaryAdvances = salaryAdvanceRepository.findAllByMonthAndYear(currentMonth, currentYear);
            } else {
                log.debug("Récupération des avances pour SUPERVISOR: {}", user.getUsername());
                salaryAdvances = salaryAdvanceRepository.findAllBySupervisorAndMonthAndYear(
                        user.getEmployee().getId(),
                        currentMonth,
                        currentYear
                );
            }
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des avances", e);
            throw new InvalidOperationException(
                    "Erreur lors de la récupération des avances",
                    ErrorCodes.DATABASE_ERROR
            );
        }

        if (salaryAdvances.isEmpty()) {
            log.info("Aucune avance trouvée pour {}/{}", currentMonth, currentYear);
            return Collections.emptyList();
        }

        List<Employee> employees = salaryAdvances.stream()
                .map(SalaryAdvance::getEmployee)
                .toList();

        Map<Long, AttendanceDto> attendanceMap = attendanceService.findAllByCurrentMonthAndEmployeeIn(employees);

        return salaryAdvances.stream()
                .map(salaryAdvance -> {
                    SalaryAdvanceDto dto = salaryAdvanceMapper.toDTO(salaryAdvance);
                    AttendanceDto attendance = attendanceMap.get(salaryAdvance.getEmployee().getId());
                    if (attendance != null) {
                        dto.getEmployee().setAttendance(attendance);
                    }
                    return dto;
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SalaryAdvanceDto> findAllHistory(Principal connectedUser) {
        if (connectedUser == null) {
            throw new InvalidOperationException(
                    "Utilisateur non authentifié",
                    ErrorCodes.UNKNOWN_CONTEXT
            );
        }

        User user = getUserFromPrincipal(connectedUser);

        if (user.getRole() != ADMIN) {
            throw new InvalidOperationException(
                    "Accès non autorisé à l'historique complet des avances",
                    ErrorCodes.UNKNOWN_CONTEXT
            );
        }

        try {
            return salaryAdvanceRepository.findAllHistoryForAdmin()
                    .stream()
                    .map(salaryAdvanceMapper::toDTO)
                    .toList();
        } catch (Exception e) {
            log.error("Erreur lors de la récupération de l'historique des avances", e);
            throw new InvalidOperationException(
                    "Erreur lors de la récupération de l'historique des avances",
                    ErrorCodes.DATABASE_ERROR
            );
        }
    }

    @Scheduled(cron = "0 0 0 1 * *")
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedSalaryAdvances() {
        log.info("Démarrage de la génération automatique des avances sur salaire");

        try {
            List<Employee> employees = employeeRepository.findAll();
            YearMonth currentYearMonth = getCurrentYearMonth();
            int currentMonth = currentYearMonth.getMonthValue();
            int currentYear = currentYearMonth.getYear();

            Set<Long> employeeIdsWithSalaryAdvance = salaryAdvanceRepository
                    .findEmployeeIdsByMonthAndYear(currentMonth, currentYear);

            List<SalaryAdvance> salaryAdvances = employees.stream()
                    .filter(employee -> !employeeIdsWithSalaryAdvance.contains(employee.getId()))
                    .filter(employee -> employeeService.isHireDateBeforeCurrentMonth(employee.getHireDate()))
                    .map(employee -> SalaryAdvance.builder()
                            .month(currentMonth)
                            .year(currentYear)
                            .employee(employee)
                            .amount(BigDecimal.ZERO)
                            .build())
                    .toList();

            if (!salaryAdvances.isEmpty()) {
                salaryAdvanceRepository.saveAll(salaryAdvances);
                log.info("{} avances sur salaire générées pour {}/{}",
                        salaryAdvances.size(), currentMonth, currentYear);
            } else {
                log.info("Aucune nouvelle avance à générer pour {}/{}", currentMonth, currentYear);
            }
        } catch (Exception e) {
            log.error("Erreur lors de la génération automatique des avances", e);
            throw new InvalidOperationException(
                    "Erreur lors de la génération automatique des avances",
                    ErrorCodes.BATCH_SAVE_FAILED
            );
        }
    }

    @Transactional
    public void create(Employee employee) {
        log.info("Création d'une avance pour l'employé: {}", employee != null ? employee.getMatricule() : "null");

        // Validation
        salaryAdvanceValidator.validateCreateRequest(employee);

        if (!employeeService.isHireDateBeforeCurrentMonth(employee.getHireDate())) {
            log.debug("Employé {} non éligible: date d'embauche trop récente", employee.getMatricule());
            return;
        }

        YearMonth currentYearMonth = getCurrentYearMonth();
        int currentMonth = currentYearMonth.getMonthValue();
        int currentYear = currentYearMonth.getYear();

        if (salaryAdvanceRepository.existsByMonthAndYearAndEmployee_Id(currentMonth, currentYear, employee.getId())) {
            log.debug("Une avance existe déjà pour l'employé {} en {}/{}",
                    employee.getMatricule(), currentMonth, currentYear);
            return;
        }

        SalaryAdvance salaryAdvance = SalaryAdvance.builder()
                .month(currentMonth)
                .year(currentYear)
                .employee(employee)
                .amount(BigDecimal.ZERO)
                .build();

        try {
            salaryAdvanceRepository.save(salaryAdvance);
            log.info("Avance créée avec succès pour l'employé {} ({}/{})",
                    employee.getMatricule(), currentMonth, currentYear);
        } catch (Exception e) {
            log.error("Erreur lors de la création de l'avance pour l'employé {}", employee.getMatricule(), e);
            throw new InvalidOperationException(
                    "Erreur lors de la création de l'avance",
                    ErrorCodes.DATABASE_ERROR
            );
        }
    }

    @Transactional
    public void batchCreate(List<Employee> employees) {
        if (employees == null || employees.isEmpty()) {
            log.warn("Liste d'employés vide pour la création batch");
            return;
        }

        log.info("Création batch d'avances pour {} employés", employees.size());

        List<Employee> eligibleEmployees = employees.stream()
                .filter(e -> e != null && employeeService.isHireDateBeforeCurrentMonth(e.getHireDate()))
                .toList();

        if (eligibleEmployees.isEmpty()) {
            log.info("Aucun employé éligible dans la liste");
            return;
        }

        YearMonth yearMonth = getCurrentYearMonth();
        int currentMonth = yearMonth.getMonthValue();
        int currentYear = yearMonth.getYear();

        Set<Long> employeeIdsWithSalaryAdvances = salaryAdvanceRepository
                .findEmployeeIdsByMonthAndYearAndEmployee_IdIn(
                        currentMonth,
                        currentYear,
                        eligibleEmployees.stream()
                                .map(Employee::getId)
                                .toList());

        List<SalaryAdvance> salaryAdvances = eligibleEmployees.stream()
                .filter(e -> !employeeIdsWithSalaryAdvances.contains(e.getId()))
                .map(employee -> SalaryAdvance.builder()
                        .month(currentMonth)
                        .year(currentYear)
                        .employee(employee)
                        .amount(BigDecimal.ZERO)
                        .build())
                .toList();

        if (!salaryAdvances.isEmpty()) {
            try {
                salaryAdvanceRepository.saveAll(salaryAdvances);
                log.info("{} avances créées avec succès", salaryAdvances.size());
            } catch (Exception e) {
                log.error("Erreur lors de la création batch des avances", e);
                throw new InvalidOperationException(
                        "Erreur lors de la création batch des avances",
                        ErrorCodes.BATCH_SAVE_FAILED
                );
            }
        } else {
            log.info("Aucune nouvelle avance à créer");
        }
    }

    @Transactional
    public void batchUpdate(Principal connectedUser, List<SalaryAdvanceRequestDto> salaryAdvanceRequests) {
        if (connectedUser == null) {
            throw new InvalidOperationException(
                    "Utilisateur non authentifié",
                    ErrorCodes.UNKNOWN_CONTEXT
            );
        }

        if (salaryAdvanceRequests == null || salaryAdvanceRequests.isEmpty()) {
            log.warn("Liste de requêtes vide pour la mise à jour batch");
            return;
        }

        log.info("Début de la mise à jour batch de {} avances", salaryAdvanceRequests.size());

        User user = userService.getManagedUser(connectedUser);
        YearMonth currentYearMonth = getCurrentYearMonth();

        // Récupération du deadline pour les superviseurs
        SalaryAdvanceDeadline deadline = null;
        if (user.getRole() == SUPERVISOR) {
            deadline = salaryAdvanceDeadlineRepository
                    .findByMonthAndYear(currentYearMonth.getMonthValue(), currentYearMonth.getYear())
                    .orElse(null);
        }

        // Validation des requêtes
        SalaryAdvanceValidator.BatchValidationResult validationResult =
                salaryAdvanceValidator.validateBatchUpdate(salaryAdvanceRequests, user, deadline, currentYearMonth);

        if (validationResult.hasErrors()) {
            log.error("Validation échouée avec {} erreurs", validationResult.getAllErrors().size());
            validationResult.getAllErrors().stream().limit(10).forEach(error ->
                    log.error("Erreur de validation: {}", error)
            );

            throw new InvalidEntityException(
                    "Les données des avances sont invalides",
                    ErrorCodes.SALARY_ADVANCE_NOT_VALID,
                    validationResult.getAllErrors()
            );
        }

        // Récupération des avances existantes
        List<Long> salaryAdvanceRequestIds = salaryAdvanceRequests.stream()
                .map(SalaryAdvanceRequestDto::getId)
                .toList();

        Map<Long, SalaryAdvance> salaryAdvanceMap;
        try {
            salaryAdvanceMap = salaryAdvanceRepository.findAllById(salaryAdvanceRequestIds)
                    .stream()
                    .collect(Collectors.toMap(SalaryAdvance::getId, sa -> sa));
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des avances", e);
            throw new InvalidOperationException(
                    "Erreur lors de la récupération des avances",
                    ErrorCodes.DATABASE_ERROR
            );
        }

        // Vérification que toutes les avances existent
        Set<Long> foundIds = salaryAdvanceMap.keySet();
        List<Long> missingIds = salaryAdvanceRequestIds.stream()
                .filter(id -> !foundIds.contains(id))
                .toList();

        if (!missingIds.isEmpty()) {
            throw new EntityNotFoundException(
                    "Avances non trouvées: " + missingIds,
                    ErrorCodes.SALARY_ADVANCE_NOT_FOUND
            );
        }

        // Récupération des présences
        List<Employee> employees = salaryAdvanceMap.values().stream()
                .map(SalaryAdvance::getEmployee)
                .toList();

        Map<Long, AttendanceDto> attendanceMap = attendanceService.findAllByCurrentMonthAndEmployeeIn(employees);

        // Traitement des mises à jour
        int updatedCount = 0;
        int skippedCount = 0;

        for (SalaryAdvanceRequestDto request : salaryAdvanceRequests) {
            try {
                SalaryAdvance salaryAdvance = salaryAdvanceMap.get(request.getId());
                Employee employee = salaryAdvance.getEmployee();

                // Vérification des autorisations
                try {
                    userService.validateAuthorization(user, employee.getMatricule());
                } catch (Exception e) {
                    log.warn("Accès non autorisé pour l'utilisateur {} sur l'employé {}",
                            user.getUsername(), employee.getMatricule());
                    skippedCount++;
                    continue;
                }

                AttendanceDto attendance = attendanceMap.get(employee.getId());

                // Vérification d'éligibilité
                boolean isEligible = salaryAdvanceValidator.checkEmployeeEligibility(employee, attendance, user);

                if (isEligible) {
                    salaryAdvance.setAmount(request.getAmount());
                    salaryAdvance.setComment(request.getComment());
                    updatedCount++;
                    log.debug("Avance {} mise à jour: montant={}, commentaire={}",
                            request.getId(), request.getAmount(), request.getComment());
                } else {
                    log.debug("Avance {} non mise à jour: employé non éligible", request.getId());
                    skippedCount++;
                }
            } catch (Exception e) {
                log.error("Erreur lors du traitement de l'avance {}", request.getId(), e);
                skippedCount++;
            }
        }

        log.info("Mise à jour batch terminée: {} mises à jour, {} ignorées", updatedCount, skippedCount);
    }

    // =========================
    // HELPERS
    // =========================

    private YearMonth getCurrentYearMonth() {
        return YearMonth.now(ZoneId.of("Africa/Tunis"));
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
