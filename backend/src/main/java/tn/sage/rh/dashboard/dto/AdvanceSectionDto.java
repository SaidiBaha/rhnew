package tn.sage.rh.dashboard.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class AdvanceSectionDto {
    private long totalRequests;
    private BigDecimal totalAmountDone;
    private long enCoursCount;
    private double approvalRate;
    private long deltaRequests;
    private List<AdvanceStatusPointDto> chartStatus;
    private List<DeptAvgAmountDto> chartAvgByDept;
}
