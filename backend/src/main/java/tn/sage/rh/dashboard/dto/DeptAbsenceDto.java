package tn.sage.rh.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DeptAbsenceDto {
    private String dept;
    private long absent;
}
