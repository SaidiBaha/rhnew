package tn.sage.rh.hse.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HseKpiDto {
    private long totalAudits;
    private long termine;
    private long enCours;
    private long enRetard;
    private long annule;
    private long completedLate;
    private double tauxCompletion;
    private Double scoreMoyenGlobal;
}
