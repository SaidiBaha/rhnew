package tn.sage.rh.salary.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.salary.dto.SalaryAdvanceDto;
import tn.sage.rh.salary.dto.SalaryAdvanceRequestDto;
import tn.sage.rh.salary.service.SalaryAdvanceService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/salary-advances")
@RequiredArgsConstructor
public class SalaryAdvanceController {
    private final SalaryAdvanceService salaryAdvanceService;

    @GetMapping
    public ResponseEntity<List<SalaryAdvanceDto>> findAllSalaryAdvances(Principal connectedUser) {
        return ResponseEntity.ok(salaryAdvanceService.findAll(connectedUser));
    }

    @PutMapping("/batch-update")
    public ResponseEntity<?> batchUpdate(Principal connectedUser, @RequestBody List<SalaryAdvanceRequestDto> salaryAdvances) {
        salaryAdvanceService.batchUpdate(connectedUser, salaryAdvances);
        return ResponseEntity.accepted().build();
    }

}
