package tn.sage.rh.salary.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.salary.entity.SalaryAdvance;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Set;

public interface SalaryAdvanceRepository extends JpaRepository<SalaryAdvance, Long> {

    // Reuse a safe mixed sort because employee matricules are no longer always numeric.
    String SAFE_EMPLOYEE_MATRICULE_ORDER = """
        case
          when sa.employee.matricule is not null
           and function('translate', sa.employee.matricule, '0123456789', '') = ''
          then 0 else 1
        end asc,
        case
          when sa.employee.matricule is not null
           and function('translate', sa.employee.matricule, '0123456789', '') = ''
          then length(sa.employee.matricule) else 0
        end asc,
        upper(coalesce(sa.employee.matricule, '')) asc
    """;

    @Query("select sa " +
            "from SalaryAdvance sa " +
            "where sa.month = :month and sa.year = :year and " +
            "sa.employee.deleted = false and " +
            "(sa.employee.id = :supervisorId or sa.employee.supervisor.id = :supervisorId) " +
            "order by case when sa.employee.id = :supervisorId then 0 else 1 end, " + SAFE_EMPLOYEE_MATRICULE_ORDER)
    List<SalaryAdvance> findAllBySupervisorAndMonthAndYear(@Param("supervisorId") long supervisorId, @Param("month") int month, @Param("year") int year);

    @Query("select sa " +
            "from SalaryAdvance sa " +
            "where sa.month = :month and sa.year = :year and " +
            "sa.employee.deleted = false " +
            "order by " + SAFE_EMPLOYEE_MATRICULE_ORDER
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

    @Query("select sa " +
            "from SalaryAdvance sa " +
            "where sa.employee.deleted = false " +
            "order by sa.year desc, sa.month desc, " + SAFE_EMPLOYEE_MATRICULE_ORDER)
    List<SalaryAdvance> findAllHistoryForAdmin();

    @Query("""
        select sa
        from SalaryAdvance sa
        left join fetch sa.employee emp
        left join fetch emp.department dept
        where sa.createdAt >= :from
          and sa.createdAt <= :to
        order by sa.createdAt desc
    """)
    List<SalaryAdvance> findAllByCreatedAtBetween(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

}
