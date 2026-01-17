package tn.sage.rh.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.sage.rh.employee.dto.EmployeeMinimalDto;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserDto {
    private Long id;
    private UserRole role;
    private EmployeeMinimalDto employee;
}
