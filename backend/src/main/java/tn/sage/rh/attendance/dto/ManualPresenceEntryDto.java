package tn.sage.rh.attendance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/** Entrée par employé dans la saisie manuelle de présence. */
@Getter
@Setter
public class ManualPresenceEntryDto {

    @NotNull(message = "L'ID de l'employé est obligatoire")
    private Long employeeId;

    /** true = PRESENT, false = ABSENT */
    private boolean present;

    /** Motif d'absence choisi par le superviseur. Null ou vide = valeur par défaut. */
    private String absenceReason;
}
