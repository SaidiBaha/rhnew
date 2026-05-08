package tn.sage.rh.hse.audit.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AuditActivityLogDto {
    private Long id;
    private Long auditId;
    private String eventType;
    private Long performedById;
    private String performedByName;
    private LocalDateTime performedAt;
    private String detail;
}
