package tn.sage.rh.hse.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HseAuditorPerformanceItem {
    private Long employeeId;
    private String fullName;
    private String matricule;
    private long nbAssigned;
    private long nbTermine;
    private long nbEnRetard;
    private Double scoreMoyen;
    private double tauxCompletion;
}
