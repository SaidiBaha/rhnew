package tn.sage.rh.salary.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.salary.dto.SupervisorTrackingStatsDto;
import tn.sage.rh.salary.service.SupervisorAdvanceTrackingService;

@RestController
@RequestMapping("/api/v1/supervisor-advance-tracking")
@RequiredArgsConstructor
public class SupervisorAdvanceTrackingController {

    private final SupervisorAdvanceTrackingService trackingService;

    /**
     * Retourne les stats + liste complète des superviseurs pour la page de suivi.
     * Accès : ADMIN, SUPER_ADMIN uniquement.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public SupervisorTrackingStatsDto getStats() {
        return trackingService.getStats();
    }

    /**
     * Envoie manuellement une notification de relance à un superviseur spécifique.
     * Accès : ADMIN, SUPER_ADMIN uniquement.
     */
    @PostMapping("/{trackingId}/remind")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> sendReminder(@PathVariable String trackingId) {
        trackingService.sendManualReminder(trackingId);
        return ResponseEntity.ok().build();
    }
}
