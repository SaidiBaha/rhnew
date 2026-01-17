package tn.sage.rh.attendance.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import tn.sage.rh.employee.dto.EmployeeMinimalDto;

@Getter
@Setter
@Builder
public class EmployeeAttendanceDto {
    EmployeeMinimalDto employee;
    AttendanceDto attendance;
}
