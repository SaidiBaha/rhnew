package tn.sage.rh.absence.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.absence.dto.AbsenceDto;
import tn.sage.rh.absence.dto.AbsenceHistoriqueDto;
import tn.sage.rh.absence.dto.BulkUpdateAbsenceDto;
import tn.sage.rh.absence.dto.EmployeeAbsenceSummaryDto;
import tn.sage.rh.absence.dto.SaveAbsenceInputDto;
import tn.sage.rh.absence.dto.UpdateAbsenceDto;
import tn.sage.rh.absence.entity.Absence;
import tn.sage.rh.absence.service.AbsenceService;
import tn.sage.rh.employee.dto.PageResponse;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/absences")
@RequiredArgsConstructor
@Validated
public class AbsenceController {

    private final AbsenceService absenceService;

    // ─── Import / Save ────────────────────────────────────────────────────────

    @PostMapping("/batch-save")
    public ResponseEntity<Map<String, Integer>> batchSave(@Valid @RequestBody List<SaveAbsenceInputDto> inputs) {
        int saved = absenceService.batchSave(inputs);
        return ResponseEntity.ok(Map.of("saved", saved, "received", inputs.size()));
    }

    @PostMapping
    public ResponseEntity<Map<String, Integer>> save(@Valid @RequestBody SaveAbsenceInputDto input) {
        int saved = absenceService.save(input);
        return ResponseEntity.ok(Map.of("saved", saved));
    }

    // ─── List (absences-management) ──────────────────────────────────────────

    @GetMapping
    public ResponseEntity<PageResponse<AbsenceDto>> findAll(
            Principal connectedUser,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String supervisorMatricule,
            @RequestParam(required = false) String horaire,
            @RequestParam(required = false) String departement
    ) {
        Page<Absence> result = absenceService.findAllPaged(
                connectedUser, dateFrom, dateTo,
                statut, search,
                supervisorMatricule, horaire, departement,
                PageRequest.of(page, size));

        return ResponseEntity.ok(
                PageResponse.<AbsenceDto>builder()
                        .content(result.getContent().stream().map(absenceService::toDto).toList())
                        .pageNumber(result.getNumber())
                        .pageSize(result.getSize())
                        .totalElements(result.getTotalElements())
                        .totalPages(result.getTotalPages())
                        .first(result.isFirst())
                        .last(result.isLast())
                        .build()
        );
    }

    // ─── Historique per-employee summary ─────────────────────────────────────

    @GetMapping("/historique/summary")
    public ResponseEntity<List<EmployeeAbsenceSummaryDto>> getHistoriqueSummary(
            Principal connectedUser,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String departement
    ) {
        return ResponseEntity.ok(
                absenceService.getSummaryPerEmployee(connectedUser, dateFrom, dateTo, departement));
    }

    // ─── Employee detail paged ───────────────────────────────────────────────

    @GetMapping("/employee/{matricule}")
    public ResponseEntity<PageResponse<AbsenceDto>> getEmployeeAbsences(
            Principal connectedUser,
            @PathVariable String matricule,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String statut
    ) {
        Page<Absence> result = absenceService.getEmployeeAbsences(
                connectedUser, matricule, dateFrom, dateTo, statut,
                PageRequest.of(page, size));

        return ResponseEntity.ok(
                PageResponse.<AbsenceDto>builder()
                        .content(result.getContent().stream().map(absenceService::toDto).toList())
                        .pageNumber(result.getNumber())
                        .pageSize(result.getSize())
                        .totalElements(result.getTotalElements())
                        .totalPages(result.getTotalPages())
                        .first(result.isFirst())
                        .last(result.isLast())
                        .build()
        );
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    public ResponseEntity<AbsenceDto> update(
            @PathVariable Long id,
            @RequestBody UpdateAbsenceDto dto,
            Principal connectedUser) {
        return ResponseEntity.ok(absenceService.update(id, dto, connectedUser));
    }

    @PostMapping("/bulk-update")
    public ResponseEntity<Void> bulkUpdate(
            @RequestBody BulkUpdateAbsenceDto dto,
            Principal connectedUser) {
        absenceService.bulkUpdate(dto, connectedUser);
        return ResponseEntity.accepted().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        absenceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Historique chart (date-aggregated, legacy) ───────────────────────────

    @GetMapping("/historique")
    public ResponseEntity<List<AbsenceHistoriqueDto>> getHistorique() {
        return ResponseEntity.ok(absenceService.getHistorique());
    }
}
