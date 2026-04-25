package tn.sage.rh.attendance.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.attendance.audit.PresenceAuditLogDto;
import tn.sage.rh.attendance.audit.PresenceAuditLogService;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRole;

import java.security.Principal;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/presence-audit-logs")
@RequiredArgsConstructor
public class PresenceAuditLogController {

    private final PresenceAuditLogService auditLogService;

    /**
     * GET /api/v1/presence-audit-logs
     * - ADMIN / SUPER_ADMIN : tous les logs, filtrables librement
     * - SUPERVISOR / NURSE  : uniquement leurs propres actions (performedByMatricule forcé)
     */
    @GetMapping
    public ResponseEntity<Page<PresenceAuditLogDto>> getLogs(
            Principal connectedUser,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String performedByMatricule,
            @RequestParam(required = false) String employeeMatricule,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        User currentUser = resolveUser(connectedUser);
        String effectivePerformedBy = performedByMatricule;

        if (currentUser != null) {
            UserRole role = currentUser.getRole();
            boolean isRestricted = role == UserRole.SUPERVISOR || role == UserRole.NURSE;
            if (isRestricted) {
                // Force filter to current user's own matricule
                effectivePerformedBy = currentUser.getUsername();
            }
        }

        Page<PresenceAuditLogDto> result = auditLogService.findFiltered(
                module, actionType, effectivePerformedBy, employeeMatricule,
                from, to, PageRequest.of(page, size));

        return ResponseEntity.ok(result);
    }

    private User resolveUser(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken token
                && token.getPrincipal() instanceof User u) {
            return u;
        }
        return null;
    }
}
