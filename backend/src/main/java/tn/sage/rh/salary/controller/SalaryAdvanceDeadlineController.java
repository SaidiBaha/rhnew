package tn.sage.rh.salary.controller;

import lombok.RequiredArgsConstructor;
import org.mapstruct.factory.Mappers;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.salary.dto.SalaryAdvanceDeadlineMinimalDto;
import tn.sage.rh.salary.mapper.SalaryAdvanceDeadlineMapper;
import tn.sage.rh.salary.service.SalaryAdvanceDeadlineService;

@RestController
@RequestMapping("/api/v1/salary-advance-deadlines")
@RequiredArgsConstructor
public class SalaryAdvanceDeadlineController {
    private final SalaryAdvanceDeadlineService salaryAdvanceDeadlineService;
    private final SalaryAdvanceDeadlineMapper salaryAdvanceDeadlineMapper = Mappers.getMapper(SalaryAdvanceDeadlineMapper.class);

    @PostMapping
    public ResponseEntity<?> save(
    ) {
        salaryAdvanceDeadlineService.save();
        return ResponseEntity.accepted().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> delete() {
        salaryAdvanceDeadlineService.delete();
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<SalaryAdvanceDeadlineMinimalDto> findByCurrentMonthAndYear() {
        return salaryAdvanceDeadlineService.findByCurrentMonthAndYear()
                .map(salaryAdvanceDeadline -> ResponseEntity.ok(salaryAdvanceDeadlineMapper.toMinimalDto(salaryAdvanceDeadline)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
