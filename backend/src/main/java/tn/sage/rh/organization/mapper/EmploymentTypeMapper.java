package tn.sage.rh.organization.mapper;

import org.mapstruct.Mapper;
import tn.sage.rh.organization.dto.EmploymentTypeMinimalDto;
import tn.sage.rh.organization.entity.EmploymentType;

@Mapper
public interface EmploymentTypeMapper {
    EmploymentTypeMinimalDto toMinimalDTO(EmploymentType employmentType);
}
