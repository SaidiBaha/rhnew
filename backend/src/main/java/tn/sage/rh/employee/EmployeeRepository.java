package tn.sage.rh.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByMatricule(String matricule);

    @Query("select e from Employee e where e.deleted = false order by cast(e.matricule as integer) asc")
    @Override
    List<Employee> findAll();

    @Query("select e from Employee e where e.deleted = false order by cast(e.matricule as integer) asc")
    Page<Employee> findAll(Pageable pageable);

    @Query("""
        select e from Employee e
        where e.deleted = false
          and e.supervisor is not null
          and e.supervisor.matricule = :matricule
          and e.matricule <> :matricule
        order by cast(e.matricule as integer) asc
    """)
    List<Employee> findAllBySupervisor(@Param("matricule") String matricule);

    @Query("""
        select e from Employee e
        where e.deleted = false
          and e.supervisor is not null
          and e.supervisor.matricule = :matricule
          and e.matricule <> :matricule
        order by cast(e.matricule as integer) asc
    """)
    Page<Employee> findAllBySupervisor(@Param("matricule") String matricule, Pageable pageable);

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
        where e.deleted = false
          and (
               :search is null
               or :search = ''
               or upper(e.fullName) like concat(upper(:search), '%')
               or upper(e.fullName) like concat('% ', upper(:search), '%')
               or upper(e.matricule) like concat('%', upper(:search), '%')
          )
        order by cast(e.matricule as integer) asc
    """)
    Page<Employee> findAllWithSearch(@Param("search") String search, Pageable pageable);

    @Query("""
        select e
        from Employee e
        where e.deleted = false
          and e.supervisor is not null
          and e.supervisor.matricule = :matricule
          and e.matricule <> :matricule
          and (
               :search is null
               or :search = ''
               or upper(e.fullName) like concat(upper(:search), '%')
               or upper(e.fullName) like concat('% ', upper(:search), '%')
               or upper(e.matricule) like concat('%', upper(:search), '%')
          )
        order by cast(e.matricule as integer) asc
    """)
    Page<Employee> findAllBySupervisorWithSearch(@Param("matricule") String matricule, @Param("search") String search, Pageable pageable);

    @Query("""
        select e from Employee e
        where e.deleted = false
          and e.supervisor is not null
          and e.supervisor.matricule = :supervisorMatricule
          and e.matricule <> :supervisorMatricule
          and (
               :search is null
               or :search = ''
               or upper(e.fullName) like concat(upper(:search), '%')
               or upper(e.fullName) like concat('% ', upper(:search), '%')
               or upper(e.matricule) like concat('%', upper(:search), '%')
          )
        order by cast(e.matricule as integer) asc
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

    @Modifying
    @Query("UPDATE Employee e SET e.free = true WHERE e.id IN :ids")
    void updateIsFreeTrue(@Param("ids") List<Long> ids);

    List<Employee> findByFreeTrue();

    List<Employee> findByFreeTrueAndDeletedFalse();

    List<Employee> findByFree(boolean free);

    @Query("""
        select e from Employee e
        where e.free = true
          and e.deleted = false
          and (e.supervisor is null or e.supervisor.matricule <> :supervisorMatricule)
    """)
    List<Employee> findFreeEmployeesExcludingSupervisorOperators(String supervisorMatricule);

    @Modifying
    @Query("""
        update Employee e
        set e.free = true
        where e.matricule in :matricules
    """)
    int markFreeTrueByMatricules(@Param("matricules") List<String> matricules);

    @Modifying
    @Query("""
        update Employee e
        set e.free = false
        where e.matricule in :matricules
    """)
    int markFreeFalseByMatricules(@Param("matricules") List<String> matricules);

    @Query("""
        select e from Employee e
        where e.free = true
          and e.deleted = false
        order by e.fullName asc
    """)
    List<Employee> findFreeOperators();

    @Query("""
        select e
        from Employee e
        left join fetch e.supervisor s
        where e.deleted = false
          and e.free = true
    """)
    List<Employee> findFreeOperatorsWithSupervisor();

    @Modifying
    @Query("update Employee e set e.free = false")
    int resetFreeFalseForAll();

    @Query("""
        select e
        from Employee e
        where (e.deleted = false or e.deleted is null)
          and e.supervisor is not null
          and e.supervisor.matricule = :supervisorMatricule
          and e.matricule <> :supervisorMatricule
          and not exists (
              select 1
              from Permutation p
              join p.operators o
              where o = e
                and p.status <> tn.sage.rh.permutations.entity.PermutationStatus.REFUSEE
                and p.startDate <= :day and p.endDate >= :day
                and (p.startTime < :endTime and p.endTime > :startTime)
          )
        order by cast(e.matricule as integer) asc
    """)
    List<Employee> findMyOperatorsAvailableForDay(
            @Param("supervisorMatricule") String supervisorMatricule,
            @Param("day") LocalDate day,
            @Param("startTime") java.time.LocalTime startTime,
            @Param("endTime") java.time.LocalTime endTime
    );
}