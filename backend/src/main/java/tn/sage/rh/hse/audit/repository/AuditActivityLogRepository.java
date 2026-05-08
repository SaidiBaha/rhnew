package tn.sage.rh.hse.audit.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.hse.audit.entity.AuditActivityLog;

import java.util.List;

public interface AuditActivityLogRepository extends JpaRepository<AuditActivityLog, Long> {
    List<AuditActivityLog> findByAuditIdOrderByPerformedAtAsc(Long auditId);
}
