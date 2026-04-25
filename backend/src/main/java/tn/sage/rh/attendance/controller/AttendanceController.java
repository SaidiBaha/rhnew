package tn.sage.rh.attendance.controller;

import jakarta.servlet.http.HttpServletRequest;
import tn.sage.rh.config.IpUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.mapstruct.factory.Mappers;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.user.User;
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
    public ResponseEntity<?> batchSave(
            @Valid @RequestBody List<SaveAttendanceInputDto> saveAttendanceInputs,
            Principal connectedUser,
            HttpServletRequest request) {
        Long userId = null;
        if (connectedUser instanceof UsernamePasswordAuthenticationToken token
                && token.getPrincipal() instanceof User user) {
            userId = user.getId();
        }
        attendanceService.saveAll(saveAttendanceInputs, userId, null, resolveIp(request));
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

    /**
     * Mise à jour manuelle d'un enregistrement (clockIn / clockOut / motif).
     * Le paramètre optionnel `module` permet de distinguer le contexte d'appel
     * (PRESENCE_ABSENCE ou HISTORIQUE_PRESENCE) pour le log d'audit.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAttendance(
            @PathVariable Long id,
            @RequestBody UpdateAttendanceInputDto input,
            @RequestParam(required = false, defaultValue = "PRESENCE_ABSENCE") String module,
            Principal connectedUser,
            HttpServletRequest request) {
        attendanceService.updateAttendance(id, input, connectedUser, resolveIp(request), module);
        return ResponseEntity.ok().build();
    }

    /**
     * Statut d'import du jour pour l'équipe du superviseur connecté.
     */
    @GetMapping("/today/status")
    public TodayImportStatusDto getTodayStatus(Principal connectedUser) {
        return attendanceService.getTodayImportStatus(connectedUser);
    }

    /**
     * Saisie manuelle des présences/absences par le superviseur (jour courant uniquement).
     */
    @PostMapping("/manual-entry")
    public ResponseEntity<?> saveManualEntry(
            Principal connectedUser,
            @Valid @RequestBody ManualPresenceInputDto input,
            HttpServletRequest request) {
        attendanceService.saveManualEntry(connectedUser, input, resolveIp(request));
        return ResponseEntity.accepted().build();
    }

    /**
     * Bascule le statut "appelé" d'un enregistrement de présence.
     */
    @PatchMapping("/{id}/appele")
    @PreAuthorize("hasRole('NURSE')")
    public ResponseEntity<DailyAttendanceDto> toggleAppele(
            @PathVariable Long id,
            @RequestBody UpdateAppeleInputDto input,
            Principal connectedUser) {
        return ResponseEntity.ok(attendanceService.toggleAppele(id, input, connectedUser));
    }

    private String resolveIp(HttpServletRequest request) {
        return IpUtils.resolveClientIp(request);
    }
}
