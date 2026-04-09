package tn.sage.rh.attendance.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class HistoryResponseDto {
    private int    totalPresent;
    private int    totalAbsent;
    private double presenceRate;
    private List<HistoryEmployeeSummaryDto> employees;
}
