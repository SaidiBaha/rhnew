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
import tn.sage.rh.absence.dto.SaveAbsenceInputDto;
import tn.sage.rh.absence.dto.UpdateAbsenceDto;
import tn.sage.rh.absence.entity.Absence;
import tn.sage.rh.absence.service.AbsenceService;
import tn.sage.rh.employee.dto.PageResponse;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import tn.sage.rh.absence.dto.AbsenceHistoriqueDto;
import java.util.List;

@RestController
@RequestMapping("/api/v1/absences")
@RequiredArgsConstructor
@Validated
public class AbsenceController {

    private final AbsenceService absenceService;

    @PostMapping("/batch-save")
    public ResponseEntity<Void> batchSave(@Valid @RequestBody List<SaveAbsenceInputDto> inputs) {
        absenceService.batchSave(inputs);
        return ResponseEntity.accepted().build();
    }

    @PostMapping
    public ResponseEntity<Void> save(@Valid @RequestBody SaveAbsenceInputDto input) {
        absenceService.save(input);
        return ResponseEntity.accepted().build();
    }

    @GetMapping
    public ResponseEntity<PageResponse<AbsenceDto>> findAll(
            Principal connectedUser,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String statut,          // 👈 String now, not AbsenceStatut
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String supervisorMatricule,
            @RequestParam(required = false) String horaire          // 👈 added
    ) {
        Page<Absence> result = absenceService.findAllPaged(
                connectedUser, dateFrom, dateTo,
                statut, search,                                      // 👈 statut as String
                supervisorMatricule, horaire,                        // 👈 horaire added
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

    @PutMapping("/{id}")
    public ResponseEntity<AbsenceDto> update(
            @PathVariable Long id,
            @RequestBody UpdateAbsenceDto dto,
            Principal connectedUser) {
        return ResponseEntity.ok(absenceService.update(id, dto, connectedUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        absenceService.delete(id);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/historique")
    public ResponseEntity<List<AbsenceHistoriqueDto>> getHistorique() {
        return ResponseEntity.ok(absenceService.getHistorique());
    }
}