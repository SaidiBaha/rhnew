package tn.sage.rh.organization.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.organization.dto.ProductionLineMinimalDto;
import tn.sage.rh.organization.service.ProductionLineService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/production-lines")
@RequiredArgsConstructor
public class ProductionLineController {

    private final ProductionLineService productionLineService;

    @GetMapping
    public List<ProductionLineMinimalDto> findAll() {
        return productionLineService.findAll();
    }

    @GetMapping("/admin")
    public List<ProductionLineMinimalDto> findAllForAdmin() {
        return productionLineService.findAllForAdmin();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductionLineMinimalDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(productionLineService.findById(id));
    }

    @PostMapping
    public ResponseEntity<ProductionLineMinimalDto> create(@RequestBody ProductionLineMinimalDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productionLineService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductionLineMinimalDto> update(@PathVariable Long id, @RequestBody ProductionLineMinimalDto dto) {
        return ResponseEntity.ok(productionLineService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productionLineService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
