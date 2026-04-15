package tn.sage.rh.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Statut d'import pour le jour courant, côté superviseur.
 * <ul>
 *   <li>{@code count}  — nombre d'enregistrements de l'équipe aujourd'hui</li>
 *   <li>{@code source} — "XLSX_IMPORT" | "MANUAL_SUPERVISOR" | null si count = 0</li>
 * </ul>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TodayImportStatusDto {
    private long count;
    private String source;
}
