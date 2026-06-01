package tn.sage.rh.hse.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HseLineSummaryReportItem {
    private String lineZone;
    private long nbAudits;
    private Double scoreMoyen;
    private long nbNok;
    private String niveauDominant;
}
