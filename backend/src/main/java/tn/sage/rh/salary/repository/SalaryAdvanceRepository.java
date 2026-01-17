package tn.sage.rh.salary.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.salary.entity.SalaryAdvance;

import java.util.Collection;
import java.util.List;
import java.util.Set;

public interface SalaryAdvanceRepository extends JpaRepository<SalaryAdvance, Long> {

    @Query("select sa " +
            "from SalaryAdvance sa " +
            "where sa.month = :month and sa.year = :year and " +
            "sa.employee.deleted = false and sa.employee.supervisor.id = :supervisorId " +
            "order by cast(sa.employee.matricule as integer) asc")
    List<SalaryAdvance> findAllBySupervisorAndMonthAndYear(@Param("supervisorId") long supervisorId, @Param("month") int month, @Param("year") int year);

    @Query("select sa " +
            "from SalaryAdvance sa " +
            "where sa.month = :month and sa.year = :year and " +
            "sa.employee.deleted = false " +
            "order by cast(sa.employee.matricule as integer) asc"
    )
    List<SalaryAdvance> findAllByMonthAndYear(@Param("month") int month, @Param("year") int year);

    boolean existsByMonthAndYearAndEmployee_Id(Integer month, Integer year, Long id);

    @Query("SELECT sa.employee.id " +
            "FROM SalaryAdvance sa " +
            "WHERE sa.month = :month AND sa.year = :year")
    Set<Long> findEmployeeIdsByMonthAndYear(Integer month, Integer year);

    @Query("SELECT sa.employee.id " +
            "FROM SalaryAdvance sa " +
            "WHERE sa.month = :month AND sa.year = :year AND sa.employee.id IN :employeeIds"
    )
    Set<Long> findEmployeeIdsByMonthAndYearAndEmployee_IdIn(@Param("month") int month, @Param("year") int year, @Param("employeeIds") Collection<Long> employeeIds);

}
