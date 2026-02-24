package tn.sage.rh.salary.validator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tn.sage.rh.attendance.dto.AttendanceDto;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.exeption.ErrorCodes;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.exeption.InvalidOperationException;
import tn.sage.rh.salary.dto.SalaryAdvanceRequestDto;
import tn.sage.rh.salary.entity.SalaryAdvanceDeadline;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRole;
import tn.sage.rh.user.UserService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

@Component
@Slf4j
@RequiredArgsConstructor
public class SalaryAdvanceValidator {

    private final EmployeeRepository employeeRepository;
    private final UserService userService;

    /**
     * Valide une requête de création d'avance sur salaire
     */
    public void validateCreateRequest(Employee employee) {
        List<String> errors = new ArrayList<>();

        if (employee == null) {
            errors.add("L'employé ne peut pas être null");
            throw new InvalidEntityException(
                    "Erreur lors de la création de l'avance",
                    ErrorCodes.SALARY_ADVANCE_NOT_VALID,
                    errors
            );
        }

        if (employee.getId() == 0) {
            errors.add("L'ID de l'employé est invalide");
        }

        if (!errors.isEmpty()) {
            throw new InvalidEntityException(
                    "Données invalides pour la création d'avance",
                    ErrorCodes.SALARY_ADVANCE_NOT_VALID,
                    errors
            );
        }
    }

    /**
     * Valide un batch de mises à jour d'avances
     */
    public BatchValidationResult validateBatchUpdate(
            List<SalaryAdvanceRequestDto> requests,
            User user,
            SalaryAdvanceDeadline deadline,
            YearMonth currentYearMonth) {

        BatchValidationResult result = new BatchValidationResult();

        if (requests == null || requests.isEmpty()) {
            result.addGlobalError("La liste des avances ne peut pas être vide");
            return result;
        }

        // Validation du deadline pour les superviseurs
      /*  if (user.getRole() == UserRole.SUPERVISOR) {
            validateDeadline(deadline, currentYearMonth, result);
        }*/

        // Validation des doublons dans la requête
        validateDuplicateIds(requests, result);

        // Validation de chaque ligne
        for (int i = 0; i < requests.size(); i++) {
            List<String> lineErrors = validateSalaryAdvanceRequest(requests.get(i), i + 1);
            if (!lineErrors.isEmpty()) {
                result.addLineErrors(i + 1, lineErrors);
            }
        }

        return result;
    }

    /**
     * Valide une ligne individuelle de demande d'avance
     */
    private List<String> validateSalaryAdvanceRequest(SalaryAdvanceRequestDto dto, int lineNumber) {
        List<String> errors = new ArrayList<>();

        // Validation ID
        if (dto.getId() <= 0) {
            errors.add("L'ID de l'avance est invalide");
        }

        // Validation montant
        if (dto.getAmount() == null) {
            errors.add("Le montant est obligatoire");
        } else {
            if (dto.getAmount().compareTo(BigDecimal.ZERO) < 0) {
                errors.add("Le montant ne peut pas être négatif");
            }
            if (dto.getAmount().compareTo(new BigDecimal("5000")) > 0) {
                errors.add("Le montant ne peut pas dépasser 5000 TND");
            }
        }

        // Validation commentaire (optionnel mais pas vide si présent)
        if (dto.getComment() != null && dto.getComment().trim().isEmpty()) {
            errors.add("Le commentaire ne peut pas être vide s'il est fourni");
        }

        return errors;
    }

    /**
     * Valide le deadline
     */
   /* private void validateDeadline(SalaryAdvanceDeadline deadline, YearMonth currentYearMonth, BatchValidationResult result) {
        if (deadline == null) {
            result.addGlobalError("Aucun deadline configuré pour le mois " +
                    currentYearMonth.getMonthValue() + "/" + currentYearMonth.getYear());
            return;
        }

        if (!deadline.getDeadline().isAfter(LocalDate.now())) {
            result.addGlobalError("La date limite de saisie est dépassée. Date limite: " + deadline.getDeadline());
        }
    }*/

    /**
     * Valide les doublons d'IDs dans la requête
     */
    private void validateDuplicateIds(List<SalaryAdvanceRequestDto> requests, BatchValidationResult result) {
        Set<Long> seenIds = new HashSet<>();
        Set<Long> duplicateIds = new HashSet<>();

        for (SalaryAdvanceRequestDto request : requests) {
            if (!seenIds.add(request.getId())) {
                duplicateIds.add(request.getId());
            }
        }

        if (!duplicateIds.isEmpty()) {
            result.addGlobalError("IDs en double détectés: " + duplicateIds);
        }
    }

    /**
     * Vérifie l'éligibilité d'un employé
     */
    public boolean checkEmployeeEligibility(Employee employee, AttendanceDto attendance, User user) {
        // Les admins peuvent toujours modifier
        if (user.getRole() == UserRole.ADMIN) {
            return true;
        }

        if (employee == null) {
            throw new InvalidOperationException(
                    "Employé non trouvé",
                    ErrorCodes.EMPLOYEE_NOT_FOUND
            );
        }

        if (attendance == null) {
            throw new InvalidOperationException(
                    "Données de présence non trouvées pour l'employé " + employee.getMatricule(),
                    ErrorCodes.ATTENDANCE_NOT_FOUND
            );
        }

        // Vérification de la domiciliation bancaire
        if (employee.isHasBankDomiciliation()) {
            log.debug("Employé {} non éligible: domiciliation bancaire", employee.getMatricule());
            return false;
        }

        // Vérification des motifs d'absence exclus
        if (attendance.getAbsenceReasons() != null) {
            boolean hasExcludedAbsence = attendance.getAbsenceReasons()
                    .stream()
                    .anyMatch(ar -> List.of("MALADIE L-D", "MATERNITÉ").contains(ar.getAbsenceReason()));

            if (hasExcludedAbsence) {
                log.debug("Employé {} non éligible: motif d'absence exclusif", employee.getMatricule());
                return false;
            }
        }

        // Vérification des heures de présence
        try {
            String totalAttendance = attendance.getTotalAttendance();
            if (totalAttendance != null && totalAttendance.contains(":")) {
                long totalHours = Long.parseLong(totalAttendance.split(":")[0]);
                if (totalHours < 40) {
                    log.debug("Employé {} non éligible: heures insuffisantes ({})", employee.getMatricule(), totalHours);
                    return false;
                }
            }
        } catch (NumberFormatException e) {
            log.warn("Format d'heures invalide pour l'employé {}", employee.getMatricule());
        }

        return true;
    }

    /**
     * Valide l'autorisation d'accès
     */
    public void validateAuthorization(User user, String employeeMatricule, String operation) {
        try {
            userService.validateAuthorization(user, employeeMatricule);
        } catch (Exception e) {
            throw new InvalidOperationException(
                    "Accès non autorisé pour " + operation + " sur l'employé " + employeeMatricule,
                    ErrorCodes.UNAUTHORIZED_OPERATION
            );
        }
    }

    /**
     * Classe interne pour les résultats de validation batch
     */
    public static class BatchValidationResult {
        private final List<String> globalErrors = new ArrayList<>();
        private final Map<Integer, List<String>> lineErrors = new HashMap<>();

        public void addGlobalError(String error) {
            globalErrors.add(error);
        }

        public void addLineErrors(int lineNumber, List<String> errors) {
            if (!errors.isEmpty()) {
                lineErrors.put(lineNumber, errors);
            }
        }

        public boolean hasErrors() {
            return !globalErrors.isEmpty() || !lineErrors.isEmpty();
        }

        public List<String> getAllErrors() {
            List<String> allErrors = new ArrayList<>(globalErrors);
            lineErrors.forEach((line, errors) ->
                    errors.forEach(error ->
                            allErrors.add("Ligne " + line + " : " + error)
                    )
            );
            return allErrors;
        }

        public List<String> getGlobalErrors() {
            return Collections.unmodifiableList(globalErrors);
        }

        public Map<Integer, List<String>> getLineErrors() {
            return Collections.unmodifiableMap(lineErrors);
        }
    }
}
