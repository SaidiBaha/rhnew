package tn.sage.rh.hse.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HseLateAuditReportItem {
    private Long auditId;
    private String datePrevue;
    private String lineZone;
    private String auditorName;
    private long nbJoursRetard;
    private boolean completedLate;
}
