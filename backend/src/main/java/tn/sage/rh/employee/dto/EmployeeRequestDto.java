package tn.sage.rh.employee.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import tn.sage.rh.employee.Civility;

import java.time.LocalDate;

@Getter
@Setter
@Builder
public class EmployeeRequestDto {
    @NotBlank(message = "Matricule obligatoire")
    @Pattern(regexp = "^\\d+$", message = "Matricule invalide")
    private String matricule;

    @NotNull(message = "Civilité obligatoire")
    private Civility civility;

    @NotBlank(message = "Nom et prénom obligatoire")
    private String fullName;

    @NotBlank(message = "Département obligatoire")
    private String department;

    @NotBlank(message = "Poste Occupé obligatoire")
    private String jobTitle;

    private String productionLine;

    private String shift;

    @NotBlank(message = "Type de Travail obligatoire")
    private String employmentType;

    @NotNull(message = "Date d'Embauche obligatoire")
    private LocalDate hireDate;

    private boolean hasBankDomiciliation;

    @Pattern(regexp = "^\\d+$", message = "Matricule du Superviseur invalide")
    private String supervisor;

    private boolean isFree =false;  // free operator
}