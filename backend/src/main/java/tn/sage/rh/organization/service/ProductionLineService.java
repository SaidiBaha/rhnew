package tn.sage.rh.organization.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.sage.rh.organization.dto.ProductionLineMinimalDto;
import tn.sage.rh.organization.entity.ProductionLine;
import tn.sage.rh.organization.repository.ProductionLineRepository;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProductionLineService {
    private final ProductionLineRepository productionLineRepository;

    public ProductionLine findOrCreateProductionLine(String productionLine) {
        if (productionLine != null && !productionLine.trim().isEmpty()) {
            return productionLineRepository
                    .findByName(productionLine)
                    .orElseGet(() -> productionLineRepository.save(ProductionLine
                            .builder()
                            .name(productionLine)
                            .build()));
        }
        return null;
    }

    public List<ProductionLineMinimalDto> findAll() {

        List<String> excludedNames = List.of(
                "FORMATRICE",
                "MAINTENANCE",
                "FORMATION"
        );

        return productionLineRepository.findByNameNotIn(excludedNames)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private ProductionLineMinimalDto toDto(ProductionLine entity) {
        return ProductionLineMinimalDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .build();
    }

    public ProductionLineMinimalDto findById(Long id) {
        ProductionLine entity = productionLineRepository.findById(id)
                .orElseThrow(() ->
                        new EntityNotFoundException("Production line not found for id " + id)
                );

        return toDto(entity);
    }
 /*   public Optional<ProductionLine> findByName(String name) {
        return productionLineRepository.findByNameIgnoreCase(name.toUpperCase());
    }*/
}
