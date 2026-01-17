package tn.sage.rh.attendance.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
@Builder
public class AttendanceDto {
    private int totalDays;
    private String totalAttendance;
    private String totalOvertime;
    private Set<AbsenceReasonCount> absenceReasons;

    @Getter
    @Setter
    @Builder
    public static class AbsenceReasonCount {
        private String absenceReason;
        private int count;
    }
}
