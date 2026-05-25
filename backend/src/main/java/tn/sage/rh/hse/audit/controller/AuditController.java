package tn.sage.rh.hse.audit.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.dto.SupervisorDto;
import tn.sage.rh.hse.audit.dto.AuditActivityLogDto;
import tn.sage.rh.hse.audit.dto.AuditDto;
import tn.sage.rh.hse.audit.dto.AuditStatsDto;
import tn.sage.rh.hse.audit.dto.CreateAuditRequest;
import tn.sage.rh.hse.audit.entity.Audit;
import tn.sage.rh.hse.audit.service.AuditService;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/audits")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    public Page<AuditDto> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Audit.AuditStatus status,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to
    ) {
        if (status != null || lineZone != null || employeeId != null || from != null || to != null) {
            return auditService.findWithFilters(status, lineZone, employeeId, from, to, page, size);
        }
        return auditService.findAll(page, size);
    }

    @GetMapping("/stats")
    public AuditStatsDto getStats() {
        return auditService.getStats();
    }

    @GetMapping("/my-audits")
    public List<AuditDto> getMyAudits(Principal principal) {
        return auditService.findMyAudits(principal);
    }

    @GetMapping("/cadre-employees")
    public List<CadreEmployeeDto> getCadreEmployees() {
        return auditService.findCadreEmployees().stream()
                .map(e -> new CadreEmployeeDto(e.getId(), e.getFullName(), e.getMatricule()))
                .toList();
    }

    @GetMapping("/{id}")
    public AuditDto findById(@PathVariable Long id) {
        return auditService.findById(id);
    }

    @GetMapping("/{id}/activity")
    public List<AuditActivityLogDto> getActivityLog(@PathVariable Long id) {
        return auditService.getActivityLog(id);
    }

    @PostMapping
    public ResponseEntity<AuditDto> create(@RequestBody CreateAuditRequest request, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auditService.create(request, principal));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AuditDto> update(@PathVariable Long id, @RequestBody CreateAuditRequest request) {
        return ResponseEntity.ok(auditService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AuditDto> patchStatus(@PathVariable Long id,
                                                 @RequestParam Audit.AuditStatus status,
                                                 Principal principal) {
        return ResponseEntity.ok(auditService.patchStatus(id, status, principal));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        auditService.delete(id);
        return ResponseEntity.noContent().build();
    }

    public record CadreEmployeeDto(Long id, String fullName, String matricule) {}
}
