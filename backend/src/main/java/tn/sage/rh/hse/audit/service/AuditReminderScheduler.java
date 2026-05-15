package tn.sage.rh.hse.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tn.sage.rh.auth.EmailService;
import tn.sage.rh.hse.audit.entity.Audit;
import tn.sage.rh.hse.audit.entity.AuditActivityLog;
import tn.sage.rh.hse.audit.repository.AuditActivityLogRepository;
import tn.sage.rh.hse.audit.repository.AuditRepository;
import tn.sage.rh.notification.service.NotificationService;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuditReminderScheduler {

    private final AuditRepository auditRepository;
    private final AuditActivityLogRepository activityLogRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm");

    /** Tourne toutes les heures. Vérifie les audits à J-24h, les audits du jour J, et les audits en retard. */
    @Scheduled(cron = "0 0 * * * *")
    public void sendReminders() {
        sendReminders24h();
        sendRemindersDayOf();
        detectOverdueAudits();
    }

    private void sendReminders24h() {
        LocalDateTime from = LocalDateTime.now().plusHours(23);
        LocalDateTime to = LocalDateTime.now().plusHours(25);

        List<Audit> audits = auditRepository.findAuditsNeedingReminder24h(from, to);
        for (Audit audit : audits) {
            try {
                sendReminderNotifications(audit, "24H");
                audit.setReminder24hSent(true);
                auditRepository.save(audit);
                logActivity(audit.getId(), "RAPPEL_24H", null, "Rappel 24h envoyé automatiquement");
            } catch (Exception e) {
                log.error("Erreur rappel 24h auditId={} : {}", audit.getId(), e.getMessage());
            }
        }
    }

    private void sendRemindersDayOf() {
        LocalDateTime from = LocalDateTime.now().minusMinutes(30);
        LocalDateTime to = LocalDateTime.now().plusMinutes(30);

        List<Audit> audits = auditRepository.findAuditsNeedingReminderDayOf(from, to);
        for (Audit audit : audits) {
            try {
                sendReminderNotifications(audit, "JOUR_J");
                audit.setReminderDaySent(true);
                auditRepository.save(audit);
                logActivity(audit.getId(), "RAPPEL_JOUR", null, "Rappel jour J envoyé automatiquement");
            } catch (Exception e) {
                log.error("Erreur rappel jour J auditId={} : {}", audit.getId(), e.getMessage());
            }
        }
    }

    private void sendReminderNotifications(Audit audit, String type) {
        String dateStr = audit.getDate() != null ? audit.getDate().format(DATE_FMT) : "—";
        String auditTitle = audit.getTemplate() != null ? audit.getTemplate().getTitle() : "Audit HSE";
        String line = audit.getLineZone() != null ? audit.getLineZone() : "—";

        boolean is24h = "24H".equals(type);
        String prefixAssignee = is24h ? "Rappel : Audit HSE dans 24h" : "Rappel : Audit HSE aujourd'hui";
        String prefixHse = is24h ? "Rappel : Audit HSE dans 24h" : "Rappel : Audit HSE aujourd'hui";

        // Notification à l'auditeur assigné
        if (audit.getAssignedEmployee() != null && audit.getAssignedEmployee().getUser() != null) {
            Long assigneeUserId = audit.getAssignedEmployee().getUser().getId();
            String msgAssignee = prefixAssignee + " — " + auditTitle + " — Ligne : " + line + " — Date : " + dateStr;
            notificationService.create(assigneeUserId, prefixAssignee, msgAssignee, "/my-audits");

            if (audit.getAssignedEmployee().getEmail() != null && !audit.getAssignedEmployee().getEmail().isBlank()) {
                String email = audit.getAssignedEmployee().getEmail();
                String name = audit.getAssignedEmployee().getFullName();
                String finalDateStr = dateStr;
                String finalLine = line;
                String finalTitle = auditTitle;
                CompletableFuture.runAsync(() -> {
                    try {
                        emailService.sendAuditReminderEmail(email, name, finalTitle, finalDateStr, finalLine, type);
                    } catch (Exception e) {
                        log.error("Email rappel {} non envoyé à {} : {}", type, email, e.getMessage());
                    }
                });
            }
        }

        // Notification à l'INGENIEUR_HSE (créateur)
        if (audit.getCreatedBy() != null) {
            Long hseUserId = audit.getCreatedBy().getId();
            String msgHse = prefixHse + " — " + auditTitle + " — Ligne : " + line + " — Date : " + dateStr;
            notificationService.create(hseUserId, prefixHse, msgHse, "/audits");

            if (audit.getCreatedBy().getEmployee() != null
                    && audit.getCreatedBy().getEmployee().getEmail() != null
                    && !audit.getCreatedBy().getEmployee().getEmail().isBlank()) {
                String email = audit.getCreatedBy().getEmployee().getEmail();
                String name = audit.getCreatedBy().getEmployee().getFullName();
                String finalDateStr = dateStr;
                String finalLine = line;
                String finalTitle = auditTitle;
                CompletableFuture.runAsync(() -> {
                    try {
                        emailService.sendAuditReminderEmail(email, name, finalTitle, finalDateStr, finalLine, type);
                    } catch (Exception e) {
                        log.error("Email rappel HSE {} non envoyé à {} : {}", type, email, e.getMessage());
                    }
                });
            }
        }
    }

    private void detectOverdueAudits() {
        List<Audit> overdueAudits = auditRepository.findOverdueAuditsNotYetNotified(LocalDateTime.now());
        for (Audit audit : overdueAudits) {
            try {
                audit.setStatus(Audit.AuditStatus.EN_RETARD);
                audit.setRetardNotifSent(true);
                auditRepository.save(audit);

                String dateStr = audit.getDate() != null ? audit.getDate().format(DATE_FMT) : "—";
                String auditTitle = audit.getTemplate() != null ? audit.getTemplate().getTitle() : "Audit HSE";
                String line = audit.getLineZone() != null ? audit.getLineZone() : "—";

                // Notification à l'auditeur assigné
                if (audit.getAssignedEmployee() != null && audit.getAssignedEmployee().getUser() != null) {
                    Long assigneeUserId = audit.getAssignedEmployee().getUser().getId();
                    String msgAssignee = "Votre audit " + auditTitle + " prévu le " + dateStr
                            + " — Ligne : " + line + " est en retard — veuillez contacter votre responsable.";
                    notificationService.create(assigneeUserId, "Audit HSE en retard", msgAssignee, "/my-audits");

                    if (audit.getAssignedEmployee().getEmail() != null
                            && !audit.getAssignedEmployee().getEmail().isBlank()) {
                        String email = audit.getAssignedEmployee().getEmail();
                        String name = audit.getAssignedEmployee().getFullName();
                        String finalDateStr = dateStr;
                        String finalLine = line;
                        String finalTitle = auditTitle;
                        CompletableFuture.runAsync(() -> {
                            try {
                                emailService.sendAuditOverdueEmail(email, name, finalTitle, finalDateStr, finalLine);
                            } catch (Exception e) {
                                log.error("Email retard audit non envoyé à {} : {}", email, e.getMessage());
                            }
                        });
                    }
                }

                // Notification à l'INGENIEUR_HSE (créateur)
                if (audit.getCreatedBy() != null) {
                    Long hseUserId = audit.getCreatedBy().getId();
                    String auditeeName = audit.getAssignedEmployee() != null
                            ? audit.getAssignedEmployee().getFullName() : "Auditeur non assigné";
                    String msgHse = "L'audit " + auditTitle + " assigné à " + auditeeName
                            + " — Ligne : " + line + " — prévu le " + dateStr + " est en retard.";
                    notificationService.create(hseUserId, "Audit HSE en retard", msgHse, "/audits");

                    if (audit.getCreatedBy().getEmployee() != null
                            && audit.getCreatedBy().getEmployee().getEmail() != null
                            && !audit.getCreatedBy().getEmployee().getEmail().isBlank()) {
                        String email = audit.getCreatedBy().getEmployee().getEmail();
                        String hseName = audit.getCreatedBy().getEmployee().getFullName();
                        String finalDateStr = dateStr;
                        String finalLine = line;
                        String finalTitle = auditTitle;
                        String finalAuditeeName = auditeeName;
                        CompletableFuture.runAsync(() -> {
                            try {
                                emailService.sendAuditOverdueHseEmail(email, hseName, finalAuditeeName,
                                        finalTitle, finalDateStr, finalLine);
                            } catch (Exception e) {
                                log.error("Email retard audit HSE non envoyé à {} : {}", email, e.getMessage());
                            }
                        });
                    }
                }

                logActivity(audit.getId(), "EN_RETARD", null,
                        "Audit passé EN_RETARD automatiquement — date dépassée (" + dateStr + ")");
            } catch (Exception e) {
                log.error("Erreur détection retard auditId={} : {}", audit.getId(), e.getMessage());
            }
        }
    }

    private void logActivity(Long auditId, String eventType, Long performedById, String detail) {
        try {
            AuditActivityLog entry = AuditActivityLog.builder()
                    .auditId(auditId)
                    .eventType(eventType)
                    .performedById(performedById)
                    .detail(detail)
                    .build();
            activityLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Erreur log activité scheduler auditId={} : {}", auditId, e.getMessage());
        }
    }
}
