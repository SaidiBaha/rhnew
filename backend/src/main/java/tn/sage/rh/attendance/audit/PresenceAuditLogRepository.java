package tn.sage.rh.attendance.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface PresenceAuditLogRepository extends JpaRepository<PresenceAuditLog, Long> {

    /**
     * Requête native pour éviter le problème PSQLException "could not determine data type"
     * sur les paramètres nullable avec PostgreSQL (cf. UserActivityLogRepository).
     */
    @Query(value = """
            SELECT pal.* FROM presence_audit_logs pal
            LEFT JOIN _user u ON u.id = pal.performed_by_id
            LEFT JOIN employee e_perf ON e_perf.id = u.employee_id
            LEFT JOIN employee e_emp  ON e_emp.id  = pal.employee_id
            WHERE (CAST(:module AS varchar) IS NULL OR pal.module = CAST(:module AS varchar))
              AND (CAST(:actionType AS varchar) IS NULL OR pal.action_type = CAST(:actionType AS varchar))
              AND (CAST(:performedByMatricule AS varchar) IS NULL OR e_perf.matricule = CAST(:performedByMatricule AS varchar))
              AND (CAST(:employeeMatricule AS varchar) IS NULL OR e_emp.matricule = CAST(:employeeMatricule AS varchar))
              AND (CAST(:from AS timestamp) IS NULL OR pal.performed_at >= CAST(:from AS timestamp))
              AND (CAST(:to AS timestamp) IS NULL OR pal.performed_at <= CAST(:to AS timestamp))
            ORDER BY pal.performed_at DESC
            """,
            countQuery = """
            SELECT COUNT(*) FROM presence_audit_logs pal
            LEFT JOIN _user u ON u.id = pal.performed_by_id
            LEFT JOIN employee e_perf ON e_perf.id = u.employee_id
            LEFT JOIN employee e_emp  ON e_emp.id  = pal.employee_id
            WHERE (CAST(:module AS varchar) IS NULL OR pal.module = CAST(:module AS varchar))
              AND (CAST(:actionType AS varchar) IS NULL OR pal.action_type = CAST(:actionType AS varchar))
              AND (CAST(:performedByMatricule AS varchar) IS NULL OR e_perf.matricule = CAST(:performedByMatricule AS varchar))
              AND (CAST(:employeeMatricule AS varchar) IS NULL OR e_emp.matricule = CAST(:employeeMatricule AS varchar))
              AND (CAST(:from AS timestamp) IS NULL OR pal.performed_at >= CAST(:from AS timestamp))
              AND (CAST(:to AS timestamp) IS NULL OR pal.performed_at <= CAST(:to AS timestamp))
            """,
            nativeQuery = true)
    Page<PresenceAuditLog> findFiltered(
            @Param("module") String module,
            @Param("actionType") String actionType,
            @Param("performedByMatricule") String performedByMatricule,
            @Param("employeeMatricule") String employeeMatricule,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);
}
