package tn.sage.rh.salary.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.sage.rh.salary.entity.SupervisorAdvanceTracking;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SupervisorAdvanceTrackingRepository extends JpaRepository<SupervisorAdvanceTracking, String> {

    List<SupervisorAdvanceTracking> findAllByAttendanceImportId(String attendanceImportId);

    Optional<SupervisorAdvanceTracking> findBySupervisorIdAndAttendanceImportId(
            Long supervisorId, String attendanceImportId);

    /** Superviseurs qui n'ont pas encore complété pour un import donné, rappel non encore envoyé. */
    @Query("SELECT t FROM SupervisorAdvanceTracking t " +
           "WHERE t.attendanceImportId = :importId " +
           "AND t.statut IN ('EN_ATTENTE', 'PARTIEL') " +
           "AND t.rappelEnvoye = false")
    List<SupervisorAdvanceTracking> findPendingWithoutReminderForImport(
            @Param("importId") String importId);

    /** Superviseurs EN_ATTENTE ou PARTIEL sur l'import courant (pour dashboard). */
    @Query("SELECT t FROM SupervisorAdvanceTracking t " +
           "WHERE t.attendanceImportId = :importId " +
           "AND t.statut IN ('EN_ATTENTE', 'PARTIEL')")
    List<SupervisorAdvanceTracking> findIncompleteForImport(@Param("importId") String importId);
}
