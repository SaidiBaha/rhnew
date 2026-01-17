package tn.sage.rh.salary.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class SalaryAdvanceRequestDto {
    private long id;
    private BigDecimal amount;
    private String comment;
}
