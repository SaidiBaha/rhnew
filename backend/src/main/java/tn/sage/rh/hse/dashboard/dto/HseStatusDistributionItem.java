package tn.sage.rh.hse.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HseStatusDistributionItem {
    private String status;
    private long count;
    private double percentage;
}
