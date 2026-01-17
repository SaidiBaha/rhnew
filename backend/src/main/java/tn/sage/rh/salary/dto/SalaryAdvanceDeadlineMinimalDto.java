package tn.sage.rh.salary.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder
public class SalaryAdvanceDeadlineMinimalDto {
    private long id;
    private int month;
    private int year;
    private LocalDate deadline;
}
