package tn.sage.rh.attendance.audit;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PresenceAuditLogDto {
    private Long id;
    private String actionType;
    private String module;

    private Long performedById;
    private String performedByMatricule;
    private String performedByFullName;

    private LocalDateTime performedAt;

    private Long employeeId;
    private String employeeMatricule;
    private String employeeFullName;

    private String fieldChanged;
    private String oldValue;
    private String newValue;
    private String ipAddress;
    private String detail;
}
