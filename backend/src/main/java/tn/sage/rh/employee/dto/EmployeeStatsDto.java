package tn.sage.rh.employee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
public class EmployeeStatsDto {
    private long totalEmployees;
    private long currentEmployees;
    private long formerEmployees;
}