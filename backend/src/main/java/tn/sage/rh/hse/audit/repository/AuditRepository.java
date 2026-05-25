package tn.sage.rh.hse.audit.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.hse.audit.entity.Audit;

import java.time.LocalDate;
import java.util.List;

public interface AuditRepository extends JpaRepository<Audit, Long> {

    Page<Audit> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
        SELECT a FROM Audit a
        WHERE (:status IS NULL OR a.status = :status)
          AND (:lineZone IS NULL OR LOWER(a.lineZone) LIKE LOWER(CONCAT('%', :lineZone, '%')))
          AND (:employeeId IS NULL OR a.assignedEmployee.id = :employeeId)
          AND (:from IS NULL OR a.date >= :from)
          AND (:to IS NULL OR a.date <= :to)
        ORDER BY a.createdAt DESC
        """)
    Page<Audit> findWithFilters(
            @Param("status") Audit.AuditStatus status,
            @Param("lineZone") String lineZone,
            @Param("employeeId") Long employeeId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            Pageable pageable
    );

    List<Audit> findByAssignedEmployeeIdOrderByDateDesc(Long assignedEmployeeId);

    @Query("""
        SELECT a FROM Audit a
        WHERE a.status = tn.sage.rh.hse.audit.entity.Audit.AuditStatus.EN_ATTENTE
          AND a.reminder24hSent = false
          AND a.date = :tomorrow
        """)
    List<Audit> findAuditsNeedingReminder24h(@Param("tomorrow") LocalDate tomorrow);

    @Query("""
        SELECT a FROM Audit a
        WHERE a.status IN (tn.sage.rh.hse.audit.entity.Audit.AuditStatus.EN_ATTENTE,
                           tn.sage.rh.hse.audit.entity.Audit.AuditStatus.EN_COURS)
          AND a.reminderDaySent = false
          AND a.date = :today
        """)
    List<Audit> findAuditsNeedingReminderDayOf(@Param("today") LocalDate today);

    @Query("""
        SELECT a FROM Audit a
        WHERE a.status = tn.sage.rh.hse.audit.entity.Audit.AuditStatus.EN_ATTENTE
          AND a.date < :today
          AND a.retardNotifSent = false
        """)
    List<Audit> findOverdueAuditsNotYetNotified(@Param("today") LocalDate today);

    @Query("SELECT COUNT(a) FROM Audit a WHERE a.status = :status")
    long countByStatus(@Param("status") Audit.AuditStatus status);
}
