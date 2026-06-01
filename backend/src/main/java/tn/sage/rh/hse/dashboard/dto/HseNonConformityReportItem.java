package tn.sage.rh.hse.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HseNonConformityReportItem {
    private String dateAudit;
    private String lineZone;
    private String auditor;
    private int numero;
    private String categoryName;
    private String itemLabel;
    private String ecartDescription;
    private boolean hasPhotos;
}
