package tn.sage.rh.organization.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.organization.dto.DepartmentMinimalDto;
import tn.sage.rh.organization.service.DepartmentService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    public List<DepartmentMinimalDto> findAll() {
        return departmentService.findAll();
    }

    @PostMapping
    public ResponseEntity<DepartmentMinimalDto> create(@RequestBody DepartmentMinimalDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(departmentService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DepartmentMinimalDto> update(@PathVariable Long id, @RequestBody DepartmentMinimalDto dto) {
        return ResponseEntity.ok(departmentService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        departmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
