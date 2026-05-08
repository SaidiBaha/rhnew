package tn.sage.rh.hse.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.sage.rh.hse.audit.entity.Audit;
import tn.sage.rh.hse.checklist.dto.ChecklistInstanceDto;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditDto {
    private Long id;
    private LocalDateTime date;
    private String lineZone;
    private Long templateId;
    private String templateTitle;
    private Integer templateItemCount;
    private Long assignedEmployeeId;
    private String assignedEmployeeName;
    private String assignedEmployeeMatricule;
    private String assignedEmployeeEmail;
    private Audit.AuditStatus status;
    private String notes;
    private Long instanceId;
    private ChecklistInstanceDto instance;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private boolean reminder24hSent;
    private boolean reminderDaySent;
    private Integer filledCount;
    private Integer totalCount;
    private Integer scorePercent;
}
