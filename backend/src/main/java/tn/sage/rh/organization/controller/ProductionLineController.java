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
        return productionLineService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductionLineMinimalDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(productionLineService.findById(id));
    }

}
