package tn.sage.rh.attendance.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Body du PUT /attendances/{id}.
 * Tous les champs sont nullables :
 *   - null  → effacer la valeur existante
 *   - "HH:MM" → mettre à jour
 */
@Getter
@Setter
@NoArgsConstructor
public class UpdateAttendanceInputDto {
    /** "HH:MM" ou null pour vider. */
    private String clockIn;

    /** "HH:MM" ou null pour vider. */
    private String clockOut;

    /** Motif d'absence ou null pour vider. */
    private String absenceReason;
}
