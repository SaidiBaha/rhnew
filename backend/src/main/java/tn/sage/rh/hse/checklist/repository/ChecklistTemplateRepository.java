package tn.sage.rh.hse.checklist.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.hse.checklist.entity.ChecklistTemplate;

public interface ChecklistTemplateRepository extends JpaRepository<ChecklistTemplate, Long> {
}
