package tn.sage.rh.attendance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Corps de la requête POST /attendances/manual-entry.
 * Permet au superviseur de saisir manuellement les présences/absences
 * de son équipe pour le jour courant.
 */
@Getter
@Setter
public class ManualPresenceInputDto {

    @NotBlank(message = "Le shift est obligatoire")
    private String horaire;

    @NotBlank(message = "L'heure de début est obligatoire")
    @Pattern(regexp = "^([0-1]?\\d|2[0-3]):[0-5]\\d$", message = "Format invalide (HH:MM)")
    private String debut;

    @NotBlank(message = "L'heure de fin est obligatoire")
    @Pattern(regexp = "^([0-1]?\\d|2[0-3]):[0-5]\\d$", message = "Format invalide (HH:MM)")
    private String fin;

    @NotNull
    @NotEmpty(message = "La liste des employés ne peut pas être vide")
    @Valid
    private List<ManualPresenceEntryDto> entries;
}
