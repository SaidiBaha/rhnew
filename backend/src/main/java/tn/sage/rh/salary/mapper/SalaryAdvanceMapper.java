package tn.sage.rh.salary.mapper;

import org.mapstruct.Mapper;
import tn.sage.rh.employee.EmployeeMapper;
import tn.sage.rh.salary.dto.SalaryAdvanceDto;
import tn.sage.rh.salary.entity.SalaryAdvance;
import tn.sage.rh.user.UserMapper;

@Mapper(
        uses = {UserMapper.class, EmployeeMapper.class}
)
public interface SalaryAdvanceMapper {
    SalaryAdvanceDto toDTO(SalaryAdvance salaryAdvance);
}
