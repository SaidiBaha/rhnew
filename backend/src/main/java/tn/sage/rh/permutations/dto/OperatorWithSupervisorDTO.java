package tn.sage.rh.permutations.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperatorWithSupervisorDTO {

    // ✅ operator
    private Long operatorId;
    private String operatorFullName;
    private String operatorMatricule;

    // ✅ supervisor (peut être null)
    private Long supervisorId;
    private String supervisorFullName;
    private String supervisorMatricule;
}
