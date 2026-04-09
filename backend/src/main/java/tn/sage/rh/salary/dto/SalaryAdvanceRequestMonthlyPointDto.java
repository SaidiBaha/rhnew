package tn.sage.rh.salary.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class SalaryAdvanceRequestMonthlyPointDto {
    private String label;
    private long total;
    private long enCours;
    private long done;
}
