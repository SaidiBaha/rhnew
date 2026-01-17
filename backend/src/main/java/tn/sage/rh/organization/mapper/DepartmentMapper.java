package tn.sage.rh.organization.mapper;

import org.mapstruct.Mapper;
import tn.sage.rh.organization.dto.DepartmentMinimalDto;
import tn.sage.rh.organization.entity.Department;

@Mapper
public interface DepartmentMapper {
    DepartmentMinimalDto toMinimalDTO(Department department);
}
