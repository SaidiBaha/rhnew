package tn.sage.rh.hse.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HseScoreByLineItem {
    private String lineZone;
    private double scoreMoyen;
    private long nbChecklists;
}
