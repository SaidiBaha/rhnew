package tn.sage.rh.attendance.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.mapstruct.factory.Mappers;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.attendance.dto.DailyAttendanceDto;
import tn.sage.rh.attendance.dto.EmployeeAttendanceDto;
import tn.sage.rh.attendance.dto.HistoryResponseDto;
import tn.sage.rh.attendance.dto.ManualPresenceInputDto;
import tn.sage.rh.attendance.dto.SaveAttendanceInputDto;
import tn.sage.rh.attendance.dto.TodayImportStatusDto;
import tn.sage.rh.attendance.dto.UpdateAppeleInputDto;
import tn.sage.rh.attendance.dto.UpdateAttendanceInputDto;
import tn.sage.rh.attendance.mapper.AttendanceMapper;
import tn.sage.rh.attendance.service.AttendanceService;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/attendances")
@RequiredArgsConstructor
@Validated
public class AttendanceController {
    private final AttendanceService attendanceService;
    private final AttendanceMapper attendanceMapper = Mappers.getMapper(AttendanceMapper.class);

    /** Import batch (upsert). */
    @PostMapping("/batch-save")
    public ResponseEntity<?> batchSave(@Valid @RequestBody List<SaveAttendanceInputDto> saveAttendanceInputs) {
        attendanceService.saveAll(saveAttendanceInputs);
        return ResponseEntity.accepted().build();
    }

    /** Historique du mois courant — agrégat par employé. */
    @GetMapping
    public List<EmployeeAttendanceDto> findAllByCurrentMonth(Principal connectedUser) {
        return attendanceService.findAllByCurrentMonth(connectedUser);
    }

    /** Présences du jour courant (Africa/Tunis) — données brutes par enregistrement. */
    @GetMapping("/today")
    public List<DailyAttendanceDto> findTodayAttendances(Principal connectedUser) {
        return attendanceService.findAllByToday(connectedUser);
    }

    /** Historique filtré par plage de dates — résumé KPI + liste par employé. */
    @GetMapping("/history")
    public HistoryResponseDto findHistory(
            Principal connectedUser,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return attendanceService.findHistory(connectedUser, dateFrom, dateTo);
    }

    /** Historique journalier d'un employé sur une plage de dates. */
    @GetMapping("/history/{matricule}")
    public List<DailyAttendanceDto> findEmployeeHistory(
            Principal connectedUser,
            @PathVariable String matricule,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return attendanceService.findEmployeeHistory(connectedUser, matricule, dateFrom, dateTo);
    }

    /** Mise à jour manuelle d'un enregistrement (clockIn / clockOut / motif). */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAttendance(
            @PathVariable Long id,
            @RequestBody UpdateAttendanceInputDto input) {
        attendanceService.updateAttendance(id, input);
        return ResponseEntity.ok().build();
    }

    /**
     * Statut d'import du jour pour l'équipe du superviseur connecté.
     * Retourne : { count, source } — source = "XLSX_IMPORT" | "MANUAL_SUPERVISOR" | null
     */
    @GetMapping("/today/status")
    public TodayImportStatusDto getTodayStatus(Principal connectedUser) {
        return attendanceService.getTodayImportStatus(connectedUser);
    }

    /**
     * Saisie manuelle des présences/absences par le superviseur (jour courant uniquement).
     * UPSERT : si un enregistrement existe déjà pour (employee_id, date) → UPDATE.
     */
    @PostMapping("/manual-entry")
    public ResponseEntity<?> saveManualEntry(
            Principal connectedUser,
            @Valid @RequestBody ManualPresenceInputDto input) {
        attendanceService.saveManualEntry(connectedUser, input);
        return ResponseEntity.accepted().build();
    }

    /**
     * Bascule le statut "appelé" d'un enregistrement de présence.
     * Accessible uniquement au rôle NURSE.
     */
    @PatchMapping("/{id}/appele")
    @PreAuthorize("hasRole('NURSE')")
    public ResponseEntity<DailyAttendanceDto> toggleAppele(
            @PathVariable Long id,
            @RequestBody UpdateAppeleInputDto input,
            Principal connectedUser) {
        return ResponseEntity.ok(attendanceService.toggleAppele(id, input, connectedUser));
    }
}
