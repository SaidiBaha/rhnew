package tn.sage.rh.organization.mapper;

import org.mapstruct.Mapper;
import tn.sage.rh.organization.dto.JobTitleMinimalDto;
import tn.sage.rh.organization.entity.JobTitle;

@Mapper
public interface JobTitleMapper {
    JobTitleMinimalDto toMinimalDTO(JobTitle jobTitle);
}
