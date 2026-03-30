package tn.sage.rh.absence.dto;

import lombok.*;
import tn.sage.rh.absence.entity.AbsenceStatut;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AbsenceDto {
    private Long id;
    private String matricule;
    private String fullName;
    private String departement;
    private LocalDate date;
    private String horaire;
    private LocalTime heureDebut;
    private LocalTime heureFin;
    private LocalTime heureEntree;
    private LocalTime heureSortie;
    private AbsenceStatut statut;
    private String motif;
}