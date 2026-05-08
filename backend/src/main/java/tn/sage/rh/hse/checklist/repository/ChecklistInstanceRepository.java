package tn.sage.rh.hse.checklist.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.hse.checklist.entity.ChecklistInstance;

public interface ChecklistInstanceRepository extends JpaRepository<ChecklistInstance, Long> {
    Page<ChecklistInstance> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
