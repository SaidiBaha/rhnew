package tn.sage.rh.absence.dto;

import lombok.*;
import tn.sage.rh.absence.entity.AbsenceStatut;
import java.time.LocalTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class UpdateAbsenceDto {
    private String motif;
    private AbsenceStatut statut;
    private LocalTime heureEntree;
    private LocalTime heureSortie;
}