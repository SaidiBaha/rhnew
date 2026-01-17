package tn.sage.rh.organization.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.organization.dto.ProductionLineMinimalDto;
import tn.sage.rh.organization.dto.ProductionLineMinimalDto;
import tn.sage.rh.organization.entity.ProductionLine;
import tn.sage.rh.organization.service.ProductionLineService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/production-lines")
@RequiredArgsConstructor
public class ProductionLineController {

    private final ProductionLineService productionLineService;

    // GET /api/v1/production-lines
    @GetMapping
    public List<ProductionLineMinimalDto> findAll() {
        return productionLineService.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductionLineMinimalDto> findById(@PathVariable Long id) {
        ProductionLine line = productionLineService.getByIdOrThrow(id);
        return ResponseEntity.ok(toDto(line));
    }

    private ProductionLineMinimalDto toDto(ProductionLine entity) {
        return ProductionLineMinimalDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .build();
    }
}
