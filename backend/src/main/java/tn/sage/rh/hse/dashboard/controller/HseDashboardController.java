package tn.sage.rh.hse.dashboard.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.hse.dashboard.dto.*;
import tn.sage.rh.hse.dashboard.service.HseDashboardService;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/hse")
@RequiredArgsConstructor
public class HseDashboardController {

    private final HseDashboardService service;

    // ── Dashboard ───────────────────────────────────────────────────────────

    @GetMapping("/dashboard/kpis")
    public ResponseEntity<HseKpiDto> getKpis(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getKpis(dateFrom, dateTo, lineZone, auditorId));
    }

    @GetMapping("/dashboard/by-status")
    public ResponseEntity<List<HseStatusDistributionItem>> getByStatus(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getByStatus(dateFrom, dateTo, lineZone, auditorId));
    }

    @GetMapping("/dashboard/by-line")
    public ResponseEntity<List<HseByLineItem>> getByLine(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getByLine(dateFrom, dateTo, lineZone, auditorId));
    }

    @GetMapping("/dashboard/scores")
    public ResponseEntity<List<HseScoreByLineItem>> getScores(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getScoresByLine(dateFrom, dateTo, lineZone, auditorId));
    }

    @GetMapping("/dashboard/timeline")
    public ResponseEntity<List<HseTimelineItem>> getTimeline(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getTimeline(dateFrom, dateTo, lineZone, auditorId));
    }

    @GetMapping("/dashboard/nok-points")
    public ResponseEntity<List<HseNokPointItem>> getNokPoints(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getTopNokPoints(dateFrom, dateTo, lineZone, auditorId));
    }

    @GetMapping("/dashboard/nok-categories")
    public ResponseEntity<List<HseNokCategoryItem>> getNokCategories(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getTopNokCategories(dateFrom, dateTo, lineZone, auditorId));
    }

    @GetMapping("/dashboard/by-auditor")
    public ResponseEntity<List<HseAuditorPerformanceItem>> getByAuditor(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getByAuditor(dateFrom, dateTo, lineZone, auditorId));
    }

    @GetMapping("/dashboard/conformity-levels")
    public ResponseEntity<Map<String, Long>> getConformityLevels(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getConformityLevels(dateFrom, dateTo, lineZone, auditorId));
    }

    // ── Reports ─────────────────────────────────────────────────────────────

    @GetMapping("/reports/nonconformities")
    public ResponseEntity<List<HseNonConformityReportItem>> getNonConformityReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getNonConformityReport(dateFrom, dateTo, lineZone, auditorId));
    }

    @GetMapping("/reports/by-line")
    public ResponseEntity<List<HseLineSummaryReportItem>> getLineSummaryReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getLineSummaryReport(dateFrom, dateTo, lineZone, auditorId));
    }

    @GetMapping("/reports/late")
    public ResponseEntity<List<HseLateAuditReportItem>> getLateReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String lineZone,
            @RequestParam(required = false) Long auditorId) {
        return ResponseEntity.ok(service.getLateAuditsReport(dateFrom, dateTo, lineZone, auditorId));
    }
}
