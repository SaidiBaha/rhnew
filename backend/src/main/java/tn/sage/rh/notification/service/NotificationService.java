package tn.sage.rh.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.notification.dto.NotificationDto;
import tn.sage.rh.notification.entity.Notification;
import tn.sage.rh.notification.repository.NotificationRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /** Crée une notification pour un utilisateur spécifique. */
    @Transactional
    public void create(Long userId, String titre, String message, String lien) {
        Notification notification = Notification.builder()
                .userId(userId)
                .titre(titre)
                .message(message)
                .lien(lien)
                .lu(false)
                .build();
        notificationRepository.save(notification);
        log.debug("Notification créée pour userId={}: {}", userId, titre);
    }

    /** Crée la même notification pour une liste d'utilisateurs (batch). */
    @Transactional
    public void createForAll(List<Long> userIds, String titre, String message, String lien) {
        if (userIds == null || userIds.isEmpty()) return;

        List<Notification> notifications = userIds.stream()
                .map(uid -> Notification.builder()
                        .userId(uid)
                        .titre(titre)
                        .message(message)
                        .lien(lien)
                        .lu(false)
                        .build())
                .toList();

        notificationRepository.saveAll(notifications);
        log.info("{} notifications créées (titre={})", notifications.size(), titre);
    }

    /** Retourne les notifications d'un utilisateur, les plus récentes en premier. */
    @Transactional(readOnly = true)
    public List<NotificationDto> findByUserId(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    /** Nombre de notifications non lues pour un utilisateur. */
    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndLuFalse(userId);
    }

    /** Marque toutes les notifications d'un utilisateur comme lues. */
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    /** Marque une notification spécifique comme lue. */
    @Transactional
    public void markAsRead(String id, Long userId) {
        notificationRepository.markOneAsRead(id, userId);
    }

    private NotificationDto toDto(Notification n) {
        return NotificationDto.builder()
                .id(n.getId())
                .titre(n.getTitre())
                .message(n.getMessage())
                .lien(n.getLien())
                .lu(n.isLu())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
