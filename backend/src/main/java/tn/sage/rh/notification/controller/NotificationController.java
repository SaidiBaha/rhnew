package tn.sage.rh.notification.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.notification.dto.NotificationDto;
import tn.sage.rh.notification.service.NotificationService;
import tn.sage.rh.user.User;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** Liste des notifications de l'utilisateur connecté. */
    @GetMapping
    public List<NotificationDto> getMyNotifications(Principal connectedUser) {
        return notificationService.findByUserId(getUserId(connectedUser));
    }

    /** Nombre de notifications non lues. */
    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount(Principal connectedUser) {
        long count = notificationService.countUnread(getUserId(connectedUser));
        return Map.of("count", count);
    }

    /** Marque toutes les notifications comme lues. */
    @PatchMapping("/mark-all-read")
    public ResponseEntity<Void> markAllAsRead(Principal connectedUser) {
        notificationService.markAllAsRead(getUserId(connectedUser));
        return ResponseEntity.ok().build();
    }

    /** Marque une notification spécifique comme lue. */
    @PatchMapping("/{id}/mark-read")
    public ResponseEntity<Void> markAsRead(@PathVariable String id, Principal connectedUser) {
        notificationService.markAsRead(id, getUserId(connectedUser));
        return ResponseEntity.ok().build();
    }

    private Long getUserId(Principal connectedUser) {
        User user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();
        return user.getId();
    }
}
