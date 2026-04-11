package tn.sage.rh.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class RecentAdvanceDto {
    private String fullName;
    private BigDecimal amount;
    private String date;
    private String status;
}
