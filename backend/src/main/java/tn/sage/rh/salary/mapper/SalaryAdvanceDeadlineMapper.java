package tn.sage.rh.salary.mapper;

import org.mapstruct.Mapper;
import tn.sage.rh.salary.dto.SalaryAdvanceDeadlineMinimalDto;
import tn.sage.rh.salary.entity.SalaryAdvanceDeadline;

@Mapper
public interface SalaryAdvanceDeadlineMapper {
    SalaryAdvanceDeadlineMinimalDto toMinimalDto(SalaryAdvanceDeadline salaryAdvanceDeadline);
}
