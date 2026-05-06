package tn.sage.rh.salary.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
public class SalaryAdvanceRequestDashboardDto {
    private long totalRequests;
    private long enCoursCount;
    private long doneCount;
    private BigDecimal totalAmount;
    private BigDecimal enCoursAmount;
    private BigDecimal doneAmount;
    private List<SalaryAdvanceRequestMonthlyPointDto> monthly;
}
