package tn.sage.rh.absence.dto;

import lombok.*;
import tn.sage.rh.absence.entity.AbsenceStatut;
import java.time.LocalTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class BulkUpdateAbsenceDto {
    private List<Long> ids;
    private AbsenceStatut statut;
    private LocalTime heureEntree;
}
