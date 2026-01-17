package tn.sage.rh.attendance.mapper;

import org.mapstruct.Mapper;
import tn.sage.rh.attendance.dto.AttendanceDto;
import tn.sage.rh.attendance.entity.AbsenceReason;
import tn.sage.rh.attendance.entity.Attendance;
import tn.sage.rh.employee.EmployeeMapper;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Mapper(uses = {EmployeeMapper.class})
public interface AttendanceMapper {

    default AttendanceDto toDto(List<Attendance> attendances) {
        if (attendances == null || attendances.isEmpty()) {
            return AttendanceDto.builder()
                    .totalDays(0)
                    .totalAttendance("00:00")
                    .totalOvertime("00:00")
                    .absenceReasons(Collections.emptySet())
                    .build();
        }

        Duration totalAttendance =
                attendances
                        .stream()
                        .map(Attendance::getTotalAttendance)
                        .filter(Objects::nonNull)
                        .reduce(Duration.ZERO, Duration::plus);
        Duration totalOvertime =
                attendances
                        .stream()
                        .map(Attendance::getOvertime)
                        .filter(Objects::nonNull)
                        .reduce(Duration.ZERO, Duration::plus);

        Map<String, Long> absenceReasonCounts = attendances
                .stream()
                .map(Attendance::getAbsenceReason)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(AbsenceReason::getReason, Collectors.counting()));

        Set<AttendanceDto.AbsenceReasonCount> absenceReasons = absenceReasonCounts.entrySet().stream()
                .map(entry -> AttendanceDto.AbsenceReasonCount.builder()
                        .absenceReason(entry.getKey())
                        .count(entry.getValue().intValue())
                        .build())
                .collect(Collectors.toSet());

        return AttendanceDto
                .builder()
                .totalDays(attendances.size())
                .totalAttendance(formatDuration(totalAttendance))
                .totalOvertime(formatDuration(totalOvertime))
                .absenceReasons(absenceReasons)
                .build();
    }

    default String formatDuration(Duration duration) {
        if (duration == null) return "00:00";
        long hours = duration.toHours();
        long minutes = duration.toMinutesPart();
        return String.format("%02d:%02d", hours, minutes);
    }
}
