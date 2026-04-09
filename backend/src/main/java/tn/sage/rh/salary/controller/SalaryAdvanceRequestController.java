package tn.sage.rh.salary.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.salary.dto.*;
import tn.sage.rh.salary.service.SalaryAdvanceRequestService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/salary-advance-requests")
@RequiredArgsConstructor
public class SalaryAdvanceRequestController {

    private final SalaryAdvanceRequestService salaryAdvanceRequestService;

    @PostMapping
    public ResponseEntity<SalaryAdvanceRequestRowDto> createMyRequest(
            Principal connectedUser,
            @RequestBody SalaryAdvanceRequestCreateDto request
    ) {
        return ResponseEntity.ok(salaryAdvanceRequestService.createMyRequest(connectedUser, request));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<SalaryAdvanceRequestRowDto>> findMine(Principal connectedUser) {
        return ResponseEntity.ok(salaryAdvanceRequestService.findMyRequests(connectedUser));
    }

    @GetMapping("/admin")
    public ResponseEntity<List<SalaryAdvanceRequestRowDto>> findAllForAdmin(Principal connectedUser) {
        return ResponseEntity.ok(salaryAdvanceRequestService.findAllForAdmin(connectedUser));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<SalaryAdvanceRequestRowDto> updateStatus(
            Principal connectedUser,
            @PathVariable Long id,
            @RequestBody SalaryAdvanceRequestStatusUpdateDto request
    ) {
        return ResponseEntity.ok(salaryAdvanceRequestService.updateStatus(connectedUser, id, request));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<SalaryAdvanceRequestDashboardDto> dashboard(Principal connectedUser) {
        return ResponseEntity.ok(salaryAdvanceRequestService.getDashboardStats(connectedUser));
    }
}
