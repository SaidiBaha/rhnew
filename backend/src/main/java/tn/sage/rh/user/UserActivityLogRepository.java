package tn.sage.rh.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {

    Page<UserActivityLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @Query(value = "SELECT * FROM user_activity_logs ual " +
           "WHERE ual.user_id = :userId " +
           "AND (CAST(:eventType AS varchar) IS NULL OR ual.event_type = :eventType) " +
           "AND (CAST(:from AS timestamp) IS NULL OR ual.created_at >= CAST(:from AS timestamp)) " +
           "AND (CAST(:to AS timestamp) IS NULL OR ual.created_at <= CAST(:to AS timestamp)) " +
           "ORDER BY ual.created_at DESC",
           countQuery = "SELECT COUNT(*) FROM user_activity_logs ual " +
           "WHERE ual.user_id = :userId " +
           "AND (CAST(:eventType AS varchar) IS NULL OR ual.event_type = :eventType) " +
           "AND (CAST(:from AS timestamp) IS NULL OR ual.created_at >= CAST(:from AS timestamp)) " +
           "AND (CAST(:to AS timestamp) IS NULL OR ual.created_at <= CAST(:to AS timestamp))",
           nativeQuery = true)
    Page<UserActivityLog> findFiltered(
            @Param("userId") Long userId,
            @Param("eventType") String eventType,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);

    @Query("SELECT COUNT(DISTINCT l.user.id) FROM UserActivityLog l WHERE l.createdAt >= :since AND l.eventType = 'LOGIN'")
    long countConnectedSince(@Param("since") LocalDateTime since);
}
