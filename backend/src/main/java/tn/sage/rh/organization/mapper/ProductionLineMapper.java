package tn.sage.rh.organization.mapper;

import org.mapstruct.Mapper;
import tn.sage.rh.organization.dto.ProductionLineMinimalDto;
import tn.sage.rh.organization.entity.ProductionLine;

@Mapper
public interface ProductionLineMapper {
    ProductionLineMinimalDto toMinimalDTO(ProductionLine productionLine);
}
