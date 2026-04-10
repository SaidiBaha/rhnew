package tn.sage.rh.attendance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tn.sage.rh.attendance.entity.Attendance;
import tn.sage.rh.employee.Employee;

import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    @Query("SELECT a " +
            "FROM Attendance a " +
            "join fetch a.employee e " +
            "WHERE e.matricule IN :employeeMatricules " +
            "AND a.date BETWEEN :startDate AND :endDate")
    List<Attendance> findAllByDateBetweenAndEmployee_MatriculeIn(
            LocalDate startDate,
            LocalDate endDate,
            Set<String> employeeMatricules);


    @Query("SELECT a " +
            "FROM Attendance a " +
            "join fetch a.employee e " +
            "left join fetch a.absenceReason ar " +
            "WHERE a.date BETWEEN :startDate AND :endDate")
    List<Attendance> findAllByDateBetween(
            LocalDate startDate,
            LocalDate endDate
    );

    @Query("SELECT a " +
            "FROM Attendance a " +
            "join fetch a.employee e " +
            "left join fetch a.absenceReason ar " +
            "WHERE (e.matricule = :matricule or e.supervisor.matricule = :matricule) " +
            "and a.date BETWEEN :startDate AND :endDate")
    List<Attendance> findAllByDateBetweenAndSupervisor(
            LocalDate startDate,
            LocalDate endDate,
            String matricule
    );

    List<Attendance> findAllByDateBetweenAndEmployeeIn(LocalDate startDate,
                                                       LocalDate endDate,
                                                       Collection<Employee> employees
    );

    // ── Jour courant (module Présence / Absences) ─────────────────────────────

    @Query("SELECT a " +
            "FROM Attendance a " +
            "join fetch a.employee e " +
            "left join fetch e.department " +
            "left join fetch a.absenceReason " +
            "WHERE a.date = :date " +
            "AND e.deleted = false")
    List<Attendance> findAllByDate(LocalDate date);

    @Query("SELECT a " +
            "FROM Attendance a " +
            "join fetch a.employee e " +
            "left join fetch e.department " +
            "left join fetch a.absenceReason " +
            "WHERE a.date = :date " +
            "AND (e.matricule = :matricule OR e.supervisor.matricule = :matricule) " +
            "AND e.deleted = false")
    List<Attendance> findAllByDateAndSupervisor(LocalDate date, String matricule);

    Optional<Attendance> findByEmployee_MatriculeAndDate(String matricule, LocalDate date);

    // ── Historique filtré par plage de dates ──────────────────────────────────

    @Query("SELECT a " +
            "FROM Attendance a " +
            "join fetch a.employee e " +
            "left join fetch e.department " +
            "left join fetch a.absenceReason " +
            "WHERE (CAST(:dateFrom AS LocalDate) IS NULL OR a.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS LocalDate) IS NULL OR a.date <= :dateTo) " +
            "AND e.deleted = false")
    List<Attendance> findAllForHistory(
            @Param("dateFrom") LocalDate dateFrom,
            @Param("dateTo") LocalDate dateTo);

    @Query("SELECT a " +
            "FROM Attendance a " +
            "join fetch a.employee e " +
            "left join fetch e.department " +
            "left join fetch a.absenceReason " +
            "WHERE (e.matricule = :matricule OR e.supervisor.matricule = :matricule) " +
            "AND (CAST(:dateFrom AS LocalDate) IS NULL OR a.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS LocalDate) IS NULL OR a.date <= :dateTo) " +
            "AND e.deleted = false")
    List<Attendance> findAllForHistoryBySupervisor(
            @Param("matricule") String matricule,
            @Param("dateFrom") LocalDate dateFrom,
            @Param("dateTo") LocalDate dateTo);

    @Query("SELECT a " +
            "FROM Attendance a " +
            "join fetch a.employee e " +
            "left join fetch e.department " +
            "left join fetch a.absenceReason " +
            "WHERE e.matricule = :matricule " +
            "AND (CAST(:dateFrom AS LocalDate) IS NULL OR a.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS LocalDate) IS NULL OR a.date <= :dateTo) " +
            "ORDER BY a.date")
    List<Attendance> findByMatriculeAndDateRange(
            @Param("matricule") String matricule,
            @Param("dateFrom") LocalDate dateFrom,
            @Param("dateTo") LocalDate dateTo);

    /**
     * Même requête que findByMatriculeAndDateRange mais restreinte
     * aux employés dont le superviseur a le matricule :supervisorMatricule.
     * Utilisé pour les SUPERVISOR afin d'éviter qu'ils consultent des
     * employés hors de leur équipe.
     */
    @Query("SELECT a " +
            "FROM Attendance a " +
            "join fetch a.employee e " +
            "left join fetch e.department " +
            "left join fetch a.absenceReason " +
            "WHERE e.matricule = :matricule " +
            "AND (e.supervisor.matricule = :supervisorMatricule OR e.matricule = :supervisorMatricule) " +
            "AND (CAST(:dateFrom AS LocalDate) IS NULL OR a.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS LocalDate) IS NULL OR a.date <= :dateTo) " +
            "ORDER BY a.date")
    List<Attendance> findByMatriculeAndDateRangeForSupervisor(
            @Param("matricule") String matricule,
            @Param("supervisorMatricule") String supervisorMatricule,
            @Param("dateFrom") LocalDate dateFrom,
            @Param("dateTo") LocalDate dateTo);
}
