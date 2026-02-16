// tn/sage/rh/employee/dto/OperatorAvailabilityDTO.java
package tn.sage.rh.employee.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class OperatorAvailabilityDTO {
    private Long id;
    private String fullName;
    private String matricule;
    private boolean free;

    private Long supervisorId;
    private String supervisorFullName;
    private String supervisorMatricule;
}
