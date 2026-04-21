package tn.sage.rh.organization.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.exeption.InvalidOperationException;
import tn.sage.rh.organization.dto.ProductionLineMinimalDto;
import tn.sage.rh.organization.entity.ProductionLine;
import tn.sage.rh.organization.repository.ProductionLineRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductionLineService {
    private final ProductionLineRepository productionLineRepository;

    public List<ProductionLineMinimalDto> findAll() {
        List<String> excludedNames = List.of("FORMATRICE", "MAINTENANCE", "FORMATION");
        return productionLineRepository.findByNameNotIn(excludedNames)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<ProductionLineMinimalDto> findAllForAdmin() {
        return productionLineRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public ProductionLineMinimalDto create(ProductionLineMinimalDto dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new InvalidEntityException("Le nom est obligatoire");
        }
        productionLineRepository.findByNameIgnoreCase(dto.getName().trim())
                .ifPresent(existing -> {
                    throw new InvalidEntityException("Une ligne de production avec ce nom existe déjà");
                });
        ProductionLine saved = productionLineRepository.save(ProductionLine.builder()
                .name(dto.getName().trim())
                .build());
        return toDto(saved);
    }

    public ProductionLineMinimalDto update(Long id, ProductionLineMinimalDto dto) {
        ProductionLine existing = productionLineRepository.findById(id)
                .orElseThrow(() -> new InvalidEntityException("Ligne de production introuvable"));
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new InvalidEntityException("Le nom est obligatoire");
        }
        productionLineRepository.findByNameIgnoreCaseAndIdNot(dto.getName().trim(), id)
                .ifPresent(dup -> {
                    throw new InvalidEntityException("Une ligne de production avec ce nom existe déjà");
                });
        existing.setName(dto.getName().trim());
        return toDto(productionLineRepository.save(existing));
    }

    public void delete(Long id) {
        productionLineRepository.findById(id)
                .orElseThrow(() -> new InvalidEntityException("Ligne de production introuvable"));
        long employeeCount = productionLineRepository.countEmployeesByProductionLineId(id);
        if (employeeCount > 0) {
            throw new InvalidOperationException(
                    "Impossible de supprimer : cette ligne est utilisée par " + employeeCount + " employé(s)");
        }
        long permutationCount = productionLineRepository.countPermutationsByProductionLineId(id);
        if (permutationCount > 0) {
            throw new InvalidOperationException(
                    "Impossible de supprimer : cette ligne est utilisée par " + permutationCount + " permutation(s)");
        }
        productionLineRepository.deleteById(id);
    }

    public ProductionLine findOrCreateProductionLine(String productionLine) {
        if (productionLine != null && !productionLine.trim().isEmpty()) {
            return productionLineRepository
                    .findByName(productionLine)
                    .orElseGet(() -> productionLineRepository.save(ProductionLine.builder()
                            .name(productionLine)
                            .build()));
        }
        return null;
    }

    public ProductionLineMinimalDto findById(Long id) {
        return toDto(productionLineRepository.findById(id)
                .orElseThrow(() -> new InvalidEntityException("Ligne de production introuvable")));
    }

    private ProductionLineMinimalDto toDto(ProductionLine entity) {
        return ProductionLineMinimalDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
