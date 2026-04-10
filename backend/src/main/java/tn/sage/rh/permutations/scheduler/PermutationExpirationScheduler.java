package tn.sage.rh.permutations.scheduler;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tn.sage.rh.permutations.entity.Permutation;
import tn.sage.rh.permutations.repository.PermutationRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Hourly scheduler that marks ACCEPTEE permutations as TERMINEE
 * once their endDate + endTime has passed.
 *
 * Effect: operators whose permutation has expired are no longer
 * excluded from the "Opérateurs à envoyer" list on the next
 * form load (since existsOverlap and findMyOperatorsAvailableForDay
 * both filter by status = ACCEPTEE / IN (EN_ATTENTE, ACCEPTEE)).
 */
@Component
@RequiredArgsConstructor
public class PermutationExpirationScheduler {

    private final PermutationRepository permutationRepository;

    @Scheduled(cron = "0 0 * * * *", zone = "Africa/Tunis") // every hour at :00
    @Transactional
    public void expireTerminatedPermutations() {
        LocalDate today = LocalDate.now();
        LocalTime now   = LocalTime.now();

        // Fetch expired permutations for logging before the bulk update
        List<Permutation> expired = permutationRepository.findExpiredAccepted(today, now);

        if (expired.isEmpty()) {
            System.out.println("[PermutationExpirationScheduler] Aucune permutation expirée à terminer.");
            return;
        }

        // Log freed operators per permutation
        for (Permutation p : expired) {
            String operatorNames = p.getOperators().stream()
                    .map(op -> op.getMatricule() + " – " + op.getFullName())
                    .collect(Collectors.joining(", "));

            System.out.printf(
                "[PermutationExpirationScheduler] Permutation #%d terminée " +
                "(endDate=%s endTime=%s) — opérateurs libérés : [%s]%n",
                p.getId(), p.getEndDate(), p.getEndTime(), operatorNames
            );
        }

        // Bulk status update: ACCEPTEE → TERMINEE
        int updated = permutationRepository.markExpiredAsTerminee(today, now);
        System.out.printf(
            "[PermutationExpirationScheduler] %d permutation(s) marquée(s) TERMINEE.%n",
            updated
        );
    }
}
