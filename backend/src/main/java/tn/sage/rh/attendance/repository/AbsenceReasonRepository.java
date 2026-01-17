package tn.sage.rh.attendance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.attendance.entity.AbsenceReason;

import java.util.Optional;

public interface AbsenceReasonRepository extends JpaRepository<AbsenceReason, Long> {
    Optional<AbsenceReason> findByReason(String reason);
}
