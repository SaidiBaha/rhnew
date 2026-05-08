package tn.sage.rh.hse.checklist.dto;

import lombok.Data;
import tn.sage.rh.hse.checklist.entity.ChecklistInstance;
import tn.sage.rh.hse.checklist.entity.ChecklistResponse;

import java.time.LocalDate;
import java.util.List;

@Data
public class SaveInstanceRequest {
    private Long templateId;
    private Long auditId;
    private LocalDate date;
    private String lineUnit;
    private String teamLeader;
    private String auditor;
    private String auditorVisa;
    private String lineResponsible;
    private ChecklistInstance.InstanceStatus status;
    private List<ResponseRequest> responses;
    private List<AssignmentRequest> assignments;

    @Data
    public static class ResponseRequest {
        private Long itemId;
        private ChecklistResponse.ResponseType response;
        private String ecartDescription;
    }

    @Data
    public static class AssignmentRequest {
        private Long id;
        private String action;
        private String responsable;
        private LocalDate delai;
        private LocalDate dateRealisation;
    }
}
