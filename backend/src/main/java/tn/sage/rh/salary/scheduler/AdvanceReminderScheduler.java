package tn.sage.rh.salary.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tn.sage.rh.salary.service.SupervisorAdvanceTrackingService;

/**
 * Job planifié : vérifie toutes les heures si des superviseurs n'ont pas encore
 * complété leurs avances 24h après le dernier import de pointage.
 * Si c'est le cas, envoie une notification de rappel (une seule fois par import).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdvanceReminderScheduler {

    private final SupervisorAdvanceTrackingService trackingService;

    /** S'exécute toutes les heures (0 minute de chaque heure). */
    @Scheduled(cron = "0 0 * * * *")
    public void checkAndSendReminders() {
        log.debug("AdvanceReminderScheduler — vérification des rappels 24h");
        try {
            trackingService.sendAutomaticReminders();
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi des rappels automatiques", e);
        }
    }
}
