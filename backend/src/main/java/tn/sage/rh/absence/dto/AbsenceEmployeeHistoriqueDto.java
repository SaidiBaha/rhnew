package tn.sage.rh.absence.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AbsenceEmployeeHistoriqueDto {
    private String matricule;
    private String fullName;
    private String departement;
    private LocalDate date;
    private String horaire;
    private LocalTime heureDebut;
    private LocalTime heureFin;
    private LocalTime heureEntree;
    private LocalTime heureSortie;
    private String statut;
    private String motif;
}
