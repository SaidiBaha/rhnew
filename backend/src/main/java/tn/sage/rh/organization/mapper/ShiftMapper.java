package tn.sage.rh.organization.mapper;

import org.mapstruct.Mapper;
import tn.sage.rh.organization.dto.ShiftMinimalDto;
import tn.sage.rh.organization.entity.Shift;

@Mapper()
public interface ShiftMapper {
    ShiftMinimalDto toMinimalDTO(Shift shift);
}
