package tn.sage.rh.permutations.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.permutations.dto.MarkFreeOperatorsRequestDTO;
import tn.sage.rh.permutations.service.FreeOperatorsService;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/free-operators")
@RequiredArgsConstructor
public class FreeOperatorsController {

    private final FreeOperatorsService freeOperatorsService;

    /**
     * ✅ Marquer des opérateurs "FREE" pour une journée (et un créneau).
     * Le service bloque automatiquement ceux déjà en permutation sur le même créneau.
     */
    @PostMapping("/mark")
    public ResponseEntity<Void> markFreeForDay(@Valid @RequestBody MarkFreeOperatorsRequestDTO dto) {
        freeOperatorsService.markFreeForDay(dto);
        return ResponseEntity.ok().build();
    }

    /**
     * ✅ NEW: Récupérer la liste des opérateurs éligibles pour être marqués FREE
     * (les opérateurs déjà en permutation sur ce jour/créneau ne seront pas retournés).
     *
     * Exemple:
     * GET /api/v1/free-operators/eligible?day=2026-02-15&startTime=08:00&endTime=12:00
     */
    @GetMapping("/eligible")
    public ResponseEntity<List<EmployeeDto>> getEligibleOperatorsForFree(
            @RequestParam LocalDate day,
            @RequestParam LocalTime startTime,
            @RequestParam LocalTime endTime
    ) {
        return ResponseEntity.ok(freeOperatorsService.getEligibleOperatorsForFree(day, startTime, endTime));
    }
}
