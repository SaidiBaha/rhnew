package tn.sage.rh.salary.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.salary.entity.SalaryAdvanceDeadline;
import tn.sage.rh.salary.repository.SalaryAdvanceDeadlineRepository;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SalaryAdvanceDeadlineService {
    private final SalaryAdvanceDeadlineRepository salaryAdvanceDeadlineRepository;

    @Transactional
    public void save() {
        int currentMonth = getCurrentYearMonth().getMonthValue();
        int currentYear = getCurrentYearMonth().getYear();

        if (salaryAdvanceDeadlineRepository.findByMonthAndYear(currentMonth, currentYear).isEmpty()) {
            SalaryAdvanceDeadline salaryAdvanceDeadline = SalaryAdvanceDeadline
                    .builder()
                    .month(currentMonth)
                    .year(currentYear)
                    .deadline(LocalDate.now())
                    .build();
            salaryAdvanceDeadlineRepository.save(salaryAdvanceDeadline);
        }
    }

    @Transactional
    public void delete() {
        SalaryAdvanceDeadline salaryAdvanceDeadline = salaryAdvanceDeadlineRepository
                .findByMonthAndYear(getCurrentYearMonth().getMonthValue(), getCurrentYearMonth().getYear())
                .orElseThrow(() -> new IllegalStateException("Salary advance deadline not found."));

        salaryAdvanceDeadlineRepository.delete(salaryAdvanceDeadline);
    }

    @Transactional
    public Optional<SalaryAdvanceDeadline> findByCurrentMonthAndYear() {
        return salaryAdvanceDeadlineRepository
                .findByMonthAndYear(getCurrentYearMonth().getMonthValue(), getCurrentYearMonth().getYear());
    }

    private YearMonth getCurrentYearMonth() {
        return YearMonth.now(ZoneId.of("Africa/Tunis"));
    }
}
