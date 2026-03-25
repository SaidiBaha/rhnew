package tn.sage.rh.employee.dto;


import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class EmployeeFreeRequestDto {

    @NotEmpty(message = "Employee ids are required")
    private List<Long> employeeIds;

}
