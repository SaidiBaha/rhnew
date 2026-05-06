package tn.sage.rh.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class DeptAvgAmountDto {
    private String dept;
    private BigDecimal avgAmount;
}
