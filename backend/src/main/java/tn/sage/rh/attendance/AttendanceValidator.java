package tn.sage.rh.attendance;



import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import tn.sage.rh.attendance.dto.SaveAttendanceInputDto;

import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.exeption.EntityNotFoundException;
import tn.sage.rh.exeption.ErrorCodes;

import java.time.Duration;
import java.time.LocalDate;

import java.util.*;

@Component
@Slf4j
public class AttendanceValidator {


    private final EmployeeRepository employeeRepository;

    public AttendanceValidator(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    /**
     * Valide une liste d'entrées de présence - version assouplie
     */
    public ValidationResult validateBatch(List<SaveAttendanceInputDto> attendanceInputs) {
        ValidationResult result = new ValidationResult();

        if (attendanceInputs == null || attendanceInputs.isEmpty()) {
            result.addGlobalError("La liste des présences ne peut pas être vide");
            return result;
        }

        // Validation basique de chaque ligne (seulement les champs obligatoires)
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < attendanceInputs.size(); i++) {
            List<String> lineErrors = validateAttendanceLine(attendanceInputs.get(i));

            // Vérification des doublons dans le batch
            SaveAttendanceInputDto dto = attendanceInputs.get(i);
            String key = dto.getMatricule() + ":" + dto.getDate();
            if (!seen.add(key)) {
                lineErrors.add("Doublon détecté : " + key);
            }

            if (!lineErrors.isEmpty()) {
                result.addLineErrors(i + 1, lineErrors);
            }
        }

        return result;
    }

    /**
     * Validation minimale d'une ligne - seulement les champs essentiels
     */
    private List<String> validateAttendanceLine(SaveAttendanceInputDto dto) {
        List<String> errors = new ArrayList<>();

        // Validation matricule (obligatoire)
        if (dto.getMatricule() == null || dto.getMatricule().trim().isEmpty()) {
            errors.add("Le matricule est obligatoire");
        }

        // Validation date (obligatoire)
        if (dto.getDate() == null) {
            errors.add("La date est obligatoire");
        }

        // Validation heures (optionnelles mais si présentes doivent être cohérentes)
      /*  if (dto.getClockIn() != null && dto.getClockOut() != null) {
            if (dto.getClockOut().isBefore(dto.getClockIn())) {
                errors.add("L'heure de départ doit être après l'heure d'arrivée");
            }
        }*/

        // Validation du format des durées (si présentes)
        if (dto.getTotalAttendance() != null && !dto.getTotalAttendance().isEmpty()) {
            if (!isValidDurationFormat(dto.getTotalAttendance())) {
                errors.add("Le format de totalAttendance doit être HH:MM (ex: 08:30)");
            }
        }

        if (dto.getOvertime() != null && !dto.getOvertime().isEmpty()) {
            if (!isValidDurationFormat(dto.getOvertime())) {
                errors.add("Le format de overtime doit être HH:MM (ex: 01:30)");
            }
        }

        return errors;
    }

    private boolean isValidDurationFormat(String duration) {
        return duration.matches("^([0-1]?\\d|2[0-3]):[0-5]\\d$");
    }

    /**
     * Vérifie l'existence des employés - ne lance pas d'exception si manquants,
     * retourne simplement la map et les matricules manquants peuvent être traités
     */
    public Map<String, Employee> validateEmployeesExist(Set<String> matricules) {
        Map<String, Employee> employeeMap = employeeRepository.findAllByMatriculeIn(matricules)
                .stream()
                .collect(HashMap::new, (m, e) -> m.put(e.getMatricule(), e), HashMap::putAll);

        Set<String> missingMatricules = new HashSet<>(matricules);
        missingMatricules.removeAll(employeeMap.keySet());

        if (!missingMatricules.isEmpty()) {
            log.warn("Employés non trouvés : {}", missingMatricules);
            // On ne lance pas d'exception ici, on laisse le service décider quoi faire
        }

        return employeeMap;
    }

    /**
     * Classe interne pour stocker les résultats de validation
     */
    public static class ValidationResult {
        private final List<String> globalErrors = new ArrayList<>();
        private final List<String> globalWarnings = new ArrayList<>();
        private final Map<Integer, List<String>> lineErrors = new HashMap<>();

        public void addGlobalError(String error) {
            globalErrors.add(error);
        }

        public void addGlobalWarning(String warning) {
            globalWarnings.add(warning);
        }

        public void addLineErrors(int lineNumber, List<String> errors) {
            if (!errors.isEmpty()) {
                lineErrors.put(lineNumber, errors);
            }
        }

        public boolean hasErrors() {
            return !globalErrors.isEmpty() || !lineErrors.isEmpty();
        }

        public boolean hasWarnings() {
            return !globalWarnings.isEmpty();
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
    }
}
