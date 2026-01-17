package tn.sage.rh.salary.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.salary.entity.SalaryAdvanceDeadline;

import java.util.Optional;

public interface SalaryAdvanceDeadlineRepository extends JpaRepository<SalaryAdvanceDeadline, Long> {
    Optional<SalaryAdvanceDeadline> findByMonthAndYear(int month, int year);
}
