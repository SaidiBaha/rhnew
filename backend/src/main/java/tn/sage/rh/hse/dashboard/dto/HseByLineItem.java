package tn.sage.rh.hse.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HseByLineItem {
    private String lineZone;
    private long total;
    private long enAttente;
    private long enCours;
    private long termine;
    private long enRetard;
    private long annule;
}
