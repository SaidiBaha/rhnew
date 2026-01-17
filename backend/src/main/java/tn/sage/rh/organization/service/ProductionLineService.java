package tn.sage.rh.organization.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.sage.rh.organization.entity.ProductionLine;
import tn.sage.rh.organization.repository.ProductionLineRepository;

import java.util.List;

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

    public List<ProductionLine> findAll() {
        return productionLineRepository.findAll();
    }

    public ProductionLine getByIdOrThrow(Long id) {
        return productionLineRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Production line not found for id " + id));
    }
}
