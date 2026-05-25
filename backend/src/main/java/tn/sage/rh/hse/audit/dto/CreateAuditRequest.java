package tn.sage.rh.hse.audit.dto;

import lombok.Data;
import tn.sage.rh.hse.audit.entity.Audit;

import java.time.LocalDate;

@Data
public class CreateAuditRequest {
    private LocalDate date;
    private String lineZone;
    private Long templateId;
    private Long assignedEmployeeId;
    private Audit.AuditStatus status;
    private String notes;
    private Long instanceId;
}
