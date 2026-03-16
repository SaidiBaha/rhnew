package tn.sage.rh.permutations.scheduler;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.permutations.entity.FreeOperators;
import tn.sage.rh.permutations.repository.FreeOperatorsRepository;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class FreeOperatorsResetScheduler {

    private final FreeOperatorsRepository freeOperatorsRepository;
    private final EmployeeRepository employeeRepository;
//    @Scheduled(cron = "0 5 0 * * *", zone = "Africa/Tunis")


//    @Scheduled(cron = "0 */1 * * * *", zone = "Africa/Tunis") // ✅ test: chaque minute
@Scheduled(cron = "0 0 6,14,22 * * *", zone = "Africa/Tunis")

    @Transactional
    public void resetExpiredFreeOperators() {

        // ✅ si tu veux tester "pour tous"
        int updated = employeeRepository.resetFreeFalseForAll();
        System.out.println("✅ Reset free=false for ALL employees. Updated=" + updated);

        // (Optionnel) garder ton ancien comportement aussi
        LocalDate today = LocalDate.now();
        List<FreeOperators> expired = freeOperatorsRepository.findExpired(today);

        if (!expired.isEmpty()) {
            freeOperatorsRepository.deleteAll(expired);
        }
    }
}
