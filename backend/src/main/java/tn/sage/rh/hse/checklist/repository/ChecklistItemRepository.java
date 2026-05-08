package tn.sage.rh.hse.checklist.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.hse.checklist.entity.ChecklistItem;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {
}
