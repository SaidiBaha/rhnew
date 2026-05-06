package tn.sage.rh.dashboard.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class SupervisorPendingRowDto {
    private String trackingId;
    private String supervisorMatricule;
    private String supervisorFullName;
    private Integer nbEmployees;
    private BigDecimal montantTotal;
    private String statut;                  // EN_ATTENTE | PARTIEL
    private LocalDateTime importedAt;       // date de l'import de référence
    private LocalDateTime derniereActionAt;
}
