package tn.sage.rh.hse.checklist.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.hse.checklist.entity.ChecklistResponse;

public interface ChecklistResponseRepository extends JpaRepository<ChecklistResponse, Long> {
}
