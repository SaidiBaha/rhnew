package tn.sage.rh.employee;


import org.springframework.util.StringUtils;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.employee.dto.EmployeeRequestDto;

import java.time.LocalDate;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
public class EmployeeValidator {

    public static List<String> validate(EmployeeDto dto) {
        List<String> errors = new ArrayList<>();

        if (dto == null) {
            errors.add("L'employé ne peut pas être null.");
            return errors;
        }

        // Validation du matricule
        if (!StringUtils.hasLength(dto.getMatricule())) {
            errors.add("Le matricule de l'employé est obligatoire.");
        } else if (!dto.getMatricule().matches("^\\d+$")) {
            errors.add("Le matricule doit contenir uniquement des chiffres.");
        }

        // Validation de la civilité
        if (dto.getCivility() == null) {
            errors.add("La civilité de l'employé est obligatoire.");
        }

        // Validation du nom complet
        if (!StringUtils.hasLength(dto.getFullName())) {
            errors.add("Le nom complet de l'employé est obligatoire.");
        }

        // Validation du département
        if (dto.getDepartment() == null) {
            errors.add("Le département de l'employé est obligatoire.");
        }

        // Validation du poste
        if (dto.getJobTitle() == null) {
            errors.add("Le poste de l'employé est obligatoire.");
        }

        // Validation du type d'emploi
        if (dto.getEmploymentType() == null) {
            errors.add("Le type d'emploi de l'employé est obligatoire.");
        }

        // Validation de la date d'embauche
        if (dto.getHireDate() == null) {
            errors.add("La date d'embauche de l'employé est obligatoire.");
        } else {
            if (dto.getHireDate().isAfter(LocalDate.now())) {
                errors.add("La date d'embauche ne peut pas être dans le futur.");
            }
        }

        // Validation des dates de création et mise à jour
        if (dto.getCreatedAt() != null && dto.getUpdatedAt() != null) {
            if (dto.getUpdatedAt().isBefore(dto.getCreatedAt())) {
                errors.add("La date de mise à jour ne peut pas être antérieure à la date de création.");
            }
        }

        return errors;
    }

    public static List<String> validate(EmployeeRequestDto dto) {
        List<String> errors = new ArrayList<>();

        if (dto == null) {
            errors.add("L'employé ne peut pas être null.");
            return errors;
        }

        // Validation du matricule (déjà avec annotations, mais on ajoute une validation personnalisée)
        if (!StringUtils.hasLength(dto.getMatricule())) {
            errors.add("Le matricule de l'employé est obligatoire.");
        } else if (!dto.getMatricule().matches("^\\d+$")) {
            errors.add("Le matricule doit contenir uniquement des chiffres.");
        }

        // Validation de la civilité
        if (dto.getCivility() == null) {
            errors.add("La civilité de l'employé est obligatoire.");
        }

        // Validation du nom complet
        if (!StringUtils.hasLength(dto.getFullName())) {
            errors.add("Le nom complet de l'employé est obligatoire.");
        } else if (dto.getFullName().length() < 3) {
            errors.add("Le nom complet doit contenir au moins 3 caractères.");
        }

        // Validation du département
        if (!StringUtils.hasLength(dto.getDepartment())) {
            errors.add("Le département de l'employé est obligatoire.");
        }

        // Validation du poste
        if (!StringUtils.hasLength(dto.getJobTitle())) {
            errors.add("Le poste de l'employé est obligatoire.");
        }

        // Validation du type d'emploi
        if (!StringUtils.hasLength(dto.getEmploymentType())) {
            errors.add("Le type d'emploi de l'employé est obligatoire.");
        }

        // Validation de la ligne de production (si fournie)
        if (StringUtils.hasLength(dto.getProductionLine())) {
            if (dto.getProductionLine().length() < 2) {
                errors.add("La ligne de production doit contenir au moins 2 caractères.");
            }
        }

        // Validation du shift (si fourni)
        if (StringUtils.hasLength(dto.getShift())) {
            // Validation personnalisée pour le shift si nécessaire
            List<String> validShifts = List.of("A", "B");
            if (!validShifts.contains(dto.getShift().toUpperCase())) {
                errors.add("Le shift doit être A ou B.");
            }
        }

        // Validation de la date d'embauche
        if (dto.getHireDate() == null) {
            errors.add("La date d'embauche de l'employé est obligatoire.");
        } else {
            LocalDate today = LocalDate.now();
            if (dto.getHireDate().isAfter(today)) {
                errors.add("La date d'embauche ne peut pas être dans le futur.");
            }

            // Optionnel : validation de l'âge minimum (18 ans)
          /*  LocalDate minHireDate = today.minusYears(18);
            if (dto.getHireDate().isAfter(minHireDate)) {
                errors.add("L'employé doit avoir au moins 18 ans à la date d'embauche.");
            }*/
        }

        // Validation du superviseur (si fourni)
        if (StringUtils.hasLength(dto.getSupervisor())) {
            if (!dto.getSupervisor().matches("^\\d+$")) {
                errors.add("Le matricule du superviseur doit contenir uniquement des chiffres.");
            }

            // Vérifier que le superviseur n'est pas le même que l'employé
            if (dto.getSupervisor().equals(dto.getMatricule())) {
                errors.add("Un employé ne peut pas être son propre superviseur.");
            }
        }

        if (dto.getDepartureDate() != null && dto.getHireDate() != null
                && dto.getDepartureDate().isBefore(dto.getHireDate())) {
            errors.add("La date de départ ne peut pas être antérieure à la date d'embauche.");
        }



        // Validation de l'email (si fourni)
        if (StringUtils.hasLength(dto.getEmail()) && !dto.getEmail().isBlank()) {
            if (!dto.getEmail().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
                errors.add("L'adresse email est invalide.");
            }
        }

        return errors;
    }

    // Validation des doublons d'email dans le fichier importé
    public static List<String> validateEmailUniqueness(List<EmployeeRequestDto> requests) {

        List<String> errors = new ArrayList<>();

        // 1) Détecter les doublons d'email dans le fichier importé
        Set<String> seen = new HashSet<>();
        Set<String> duplicatesInBatch = new HashSet<>();
        for (EmployeeRequestDto req : requests) {
            String email = req.getEmail();
            if (StringUtils.hasLength(email) && !email.isBlank()) {
                if (!seen.add(email.trim().toLowerCase())) {
                    duplicatesInBatch.add(email.trim().toLowerCase());
                }
            }
        }

        // 2) Erreur par ligne : doublon dans le fichier
        for (int i = 0; i < requests.size(); i++) {
            String email = requests.get(i).getEmail();
            if (StringUtils.hasLength(email) && !email.isBlank()) {
                String normalized = email.trim().toLowerCase();
                if (duplicatesInBatch.contains(normalized)) {
                    errors.add("Ligne " + (i + 1) + " : L'email '" + email.trim() + "' est en doublon dans le fichier importé.");
                }
            }
        }



        return errors;
    }

    // Méthode utilitaire pour vérifier si un employé a toutes les informations requises
    public static boolean isValidForCreation(EmployeeRequestDto dto) {
        List<String> errors = validate(dto);
        return errors.isEmpty();
    }

    // Méthode pour valider spécifiquement la relation superviseur-opérateurs
    public static List<String> validateSupervisorRelation(EmployeeDto supervisor, EmployeeDto operator) {
        List<String> errors = new ArrayList<>();

        if (supervisor == null || operator == null) {
            errors.add("Le superviseur et l'opérateur doivent être spécifiés.");
            return errors;
        }

        if (supervisor.getId() == operator.getId()) {
            errors.add("Un employé ne peut pas être superviseur de lui-même.");
        }

        // Vérifier si le superviseur est dans le même département
        if (supervisor.getDepartment() != null && operator.getDepartment() != null) {
            if (!supervisor.getDepartment().equals(operator.getDepartment())) {
                errors.add("Le superviseur doit être dans le même département que l'opérateur.");
            }
        }

        return errors;
    }
}
