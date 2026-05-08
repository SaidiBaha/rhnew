package tn.sage.rh.hse.checklist.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.hse.checklist.dto.ChecklistTemplateDto;
import tn.sage.rh.hse.checklist.dto.ChecklistTemplateSummaryDto;
import tn.sage.rh.hse.checklist.dto.SaveTemplateRequest;
import tn.sage.rh.hse.checklist.service.ChecklistTemplateService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/checklist-templates")
@RequiredArgsConstructor
public class ChecklistTemplateController {

    private final ChecklistTemplateService templateService;

    @GetMapping
    public List<ChecklistTemplateSummaryDto> findAll() {
        return templateService.findAll();
    }

    @GetMapping("/{id}")
    public ChecklistTemplateDto findById(@PathVariable Long id) {
        return templateService.findById(id);
    }

    @PostMapping
    public ResponseEntity<ChecklistTemplateDto> create(@RequestBody SaveTemplateRequest request, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(templateService.create(request, principal));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChecklistTemplateDto> update(@PathVariable Long id, @RequestBody SaveTemplateRequest request) {
        return ResponseEntity.ok(templateService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        templateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
