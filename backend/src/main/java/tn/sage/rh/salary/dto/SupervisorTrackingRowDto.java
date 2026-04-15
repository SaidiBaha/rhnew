package tn.sage.rh.salary.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class SupervisorTrackingRowDto {
    private String trackingId;
    private Long supervisorId;
    private String supervisorMatricule;
    private String supervisorFullName;
    private String department;
    private Integer nbEmployees;
    private Integer nbAvancesSaisies;
    private BigDecimal montantTotal;
    private String statut;               // EN_ATTENTE | PARTIEL | COMPLETE
    private LocalDateTime derniereActionAt;
    private String attendanceImportId;
    private LocalDateTime importedAt;
}
