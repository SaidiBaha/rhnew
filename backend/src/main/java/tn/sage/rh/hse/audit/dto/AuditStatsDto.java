package tn.sage.rh.hse.audit.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuditStatsDto {
    private long total;
    private long enAttente;
    private long enCours;
    private long termine;
    private long annule;
    private long enRetard;
    private double tauxCompletion;
}
