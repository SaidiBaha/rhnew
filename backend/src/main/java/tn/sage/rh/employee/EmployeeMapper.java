package tn.sage.rh.employee;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.employee.dto.EmployeeMinimalDto;
import tn.sage.rh.organization.mapper.*;
import tn.sage.rh.request.mapper.RequestMapper;

@Mapper(uses = {
        DepartmentMapper.class,
        JobTitleMapper.class,
        ProductionLineMapper.class,
        ShiftMapper.class,
        EmploymentTypeMapper.class,
        RequestMapper.class,
})
public interface EmployeeMapper {

    //wissem
  /*  EmployeeDto toDTO(Employee employee);

    EmployeeMinimalDto toMinimalDTO(Employee employee);*/
    //baha
    @Mapping(source = "free", target = "isFree")
    EmployeeDto toDTO(Employee employee);

    @Mapping(source = "free", target = "isFree")
    EmployeeMinimalDto toMinimalDTO(Employee employee);
}
