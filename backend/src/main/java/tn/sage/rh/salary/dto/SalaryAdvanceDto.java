package tn.sage.rh.salary.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.user.UserDto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class SalaryAdvanceDto {
    private long id;
    private int month;
    private int year;
    private EmployeeDto employee;
    private BigDecimal amount;
    private String comment;
    private LocalDateTime updatedAt;
    private UserDto updatedBy;
}
