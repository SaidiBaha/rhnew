// tn/sage/rh/dashboard/dto/BestSupervisorDTO.java
package tn.sage.rh.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class BestSupervisorDTO {
    private Long id;
    private String fullName;
    private String matricule; // peut être null
    private long operatorsCount;
}