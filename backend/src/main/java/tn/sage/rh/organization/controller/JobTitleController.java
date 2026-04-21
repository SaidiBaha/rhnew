package tn.sage.rh.organization.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.organization.dto.JobTitleMinimalDto;
import tn.sage.rh.organization.service.JobTitleService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/job-titles")
@RequiredArgsConstructor
public class JobTitleController {

    private final JobTitleService jobTitleService;

    @GetMapping
    public List<JobTitleMinimalDto> findAll() {
        return jobTitleService.findAll();
    }

    @PostMapping
    public ResponseEntity<JobTitleMinimalDto> create(@RequestBody JobTitleMinimalDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobTitleService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobTitleMinimalDto> update(@PathVariable Long id, @RequestBody JobTitleMinimalDto dto) {
        return ResponseEntity.ok(jobTitleService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        jobTitleService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
