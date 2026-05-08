package tn.sage.rh.hse.checklist.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.hse.checklist.dto.ChecklistInstanceDto;
import tn.sage.rh.hse.checklist.dto.SaveInstanceRequest;
import tn.sage.rh.hse.checklist.service.ChecklistInstanceService;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/checklist-instances")
@RequiredArgsConstructor
public class ChecklistInstanceController {

    private final ChecklistInstanceService instanceService;

    @GetMapping
    public Page<ChecklistInstanceDto> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return instanceService.findAll(page, size);
    }

    @GetMapping("/{id}")
    public ChecklistInstanceDto findById(@PathVariable Long id) {
        return instanceService.findById(id);
    }

    @PostMapping
    public ResponseEntity<ChecklistInstanceDto> create(@RequestBody SaveInstanceRequest request, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(instanceService.create(request, principal));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChecklistInstanceDto> update(@PathVariable Long id, @RequestBody SaveInstanceRequest request) {
        return ResponseEntity.ok(instanceService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        instanceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
