package tn.sage.rh.request.mapper;

import org.mapstruct.Mapper;
import tn.sage.rh.request.Request;
import tn.sage.rh.request.dto.RequestDto;
import tn.sage.rh.request.dto.RequestMinimalDto;

@Mapper(componentModel = "spring")
public interface RequestMapper {
    RequestDto toDto(Request request);
    RequestMinimalDto toMinimalDto(Request request);
}
