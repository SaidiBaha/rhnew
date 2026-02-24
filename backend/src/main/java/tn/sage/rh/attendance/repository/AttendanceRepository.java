package tn.sage.rh.attendance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tn.sage.rh.attendance.entity.Attendance;
import tn.sage.rh.employee.Employee;

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




}
