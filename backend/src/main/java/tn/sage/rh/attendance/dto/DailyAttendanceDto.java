package tn.sage.rh.attendance.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * DTO retourné par GET /attendances/today et GET /attendances/history/{matricule}.
 * Contient les données brutes d'un enregistrement de pointage.
 * Le statut (PRÉSENT / ABSENT / PENDING) est calculé côté frontend.
 */
@Getter
@Setter
@Builder
public class DailyAttendanceDto {
    private Long      id;
    private LocalDate date;
    private String    matricule;
    private String fullName;
    private String department;

    /** Nom du shift (ex : "Shift matin", "ADM"). Peut être null. */
    private String horaire;

    /** Heure de début planifiée "HH:mm". Peut être null. */
    private String debut;

    /** Heure de fin planifiée "HH:mm". Peut être null. */
    private String fin;

    /** Heure d'entrée réelle "HH:mm". Peut être null. */
    private String clockIn;

    /** Heure de sortie réelle "HH:mm". Peut être null. */
    private String clockOut;

    /** Motif d'absence (MISSION, ABSENCE-N-Justifié…). Peut être null. */
    private String absenceReason;
}
