package tn.sage.rh.attendance.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class HistoryEmployeeSummaryDto {
    private String matricule;
    private String fullName;
    private String department;
    private int    presentDays;
    private int    absentDays;
}
