package tn.sage.rh.salary.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class SupervisorTrackingStatsDto {
    private int nbCompleted;
    private int nbMissing;
    private BigDecimal totalAmount;
    private LocalDateTime lastImportAt;
    private String lastImportId;
    private List<SupervisorTrackingRowDto> rows;
}
