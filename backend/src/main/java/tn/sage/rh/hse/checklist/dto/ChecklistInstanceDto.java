package tn.sage.rh.hse.checklist.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.sage.rh.hse.checklist.entity.ChecklistInstance;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistInstanceDto {
    private Long id;
    private Long templateId;
    private String templateTitle;
    private Long auditId;
    private LocalDate date;
    private String lineUnit;
    private String teamLeader;
    private String auditor;
    private String auditorVisa;
    private String lineResponsible;
    private ChecklistInstance.InstanceStatus status;
    private LocalDateTime createdAt;
    private List<ChecklistResponseDto> responses;
    private List<ChecklistAssignmentDto> assignments;
}
