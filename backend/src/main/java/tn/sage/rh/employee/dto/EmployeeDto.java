package tn.sage.rh.employee.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import tn.sage.rh.attendance.dto.AttendanceDto;
import tn.sage.rh.attendance.dto.EmployeeAttendanceDto;
import tn.sage.rh.employee.Civility;
import tn.sage.rh.organization.dto.*;
import tn.sage.rh.request.dto.RequestMinimalDto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
@Builder
public class EmployeeDto {
    private long id;
    private String matricule;
    private Civility civility;
    private String fullName;
    private DepartmentMinimalDto department;
    private JobTitleMinimalDto jobTitle;
    private ProductionLineMinimalDto productionLine;
    private ShiftMinimalDto shift;
    private EmploymentTypeMinimalDto employmentType;
    private LocalDate hireDate;
    private boolean hasBankDomiciliation;
    private EmployeeMinimalDto supervisor;
    private Set<EmployeeMinimalDto> operators;
    private Set<RequestMinimalDto> requests;
    private AttendanceDto attendance;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean free =false;  // free operator
}
