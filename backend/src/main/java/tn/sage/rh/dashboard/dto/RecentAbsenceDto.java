package tn.sage.rh.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RecentAbsenceDto {
    private String fullName;
    private String dept;
    private String date;
    private String absenceReason;
}
