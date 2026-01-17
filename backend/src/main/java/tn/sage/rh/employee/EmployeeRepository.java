package tn.sage.rh.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByMatricule(String matricule);

    @Query("select e from Employee e where e.deleted = false order by cast(e.matricule as integer) asc")
    @Override
    List<Employee> findAll();

    @Query("select e " +
            "from Employee e " +
            "where (e.matricule = :matricule or e.supervisor.matricule = :matricule) " +
            "and e.deleted = false  " +
            "order by cast(e.matricule as integer) asc")
    List<Employee> findAllBySupervisor(@Param("matricule") String matricule);

    @Query("""
        select e
        from Employee e
        join e.jobTitle jt
        where (e.deleted = false or e.deleted is null)
          and jt.title like '%SUPERVISEUR%'
    """)
    List<Employee> findAllSupervisors();
    List<Employee> findAllByMatriculeIn(Collection<String> matricules);
    @Query("""
    select e
    from Employee e
    where (e.deleted = false or e.deleted is null)
      and (
           :supervisorMatricule is null
           or (e.supervisor is not null and e.supervisor.matricule = :supervisorMatricule)
      )
      and (
           :search is null
           or :search = ''
           or upper(e.fullName) like concat('%', upper(:search), '%')
           or upper(e.matricule) like concat('%', upper(:search), '%')
      )
""")
    List<Employee> searchEmployeesForUser(
            @Param("supervisorMatricule") String supervisorMatricule,
            @Param("search") String search
    );
    @Query("""
        select distinct e
        from Employee e
        where e.deleted = false
        and not exists (
            select p
            from Permutation p
            join p.operators o
            where o = e
              and p.status <> tn.sage.rh.permutations.entity.PermutationStatus.REFUSEE
              and p.startDate <= :endDate
              and p.endDate >= :startDate
        )
        """)
    List<Employee> findAvailableOperators(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

}
