package tn.sage.rh.employee;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
<<<<<<< HEAD
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
=======
import tn.sage.rh.employee.dto.SupervisorDto;
import tn.sage.rh.employee.projection.ProjectBestSupervisorRow;
>>>>>>> e39960116e8b13adc77c071927f1cdecf16443b2

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByMatricule(String matricule);

    @Query("select e from Employee e where e.deleted = false order by cast(e.matricule as integer) asc")
    @Override
    List<Employee> findAll();

<<<<<<< HEAD
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
=======
    @Query(
        value      = "select e from Employee e where e.deleted = false order by cast(e.matricule as integer) asc",
        countQuery = "select count(e) from Employee e where e.deleted = false"
    )
    Page<Employee> findAllPaged(Pageable pageable);
/*
    @Query("select e " +
            "from Employee e " +
            "where (e.matricule = :matricule or e.supervisor.matricule = :matricule) " +
            "and e.deleted = false  " +
            "order by cast(e.matricule as integer) asc")
>>>>>>> e39960116e8b13adc77c071927f1cdecf16443b2
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

    @Query(
        value      = """
            select e from Employee e
            where e.deleted = false
              and e.supervisor is not null
              and e.supervisor.matricule = :matricule
              and e.matricule <> :matricule
            order by cast(e.matricule as integer) asc
            """,
        countQuery = """
            select count(e) from Employee e
            where e.deleted = false
              and e.supervisor is not null
              and e.supervisor.matricule = :matricule
              and e.matricule <> :matricule
            """
    )
    Page<Employee> findAllBySupervisorPaged(@Param("matricule") String matricule, Pageable pageable);

    @Query(
        value = """
            select e from Employee e
            where e.deleted = false
              and (:supervisorMatricule is null
                   or (e.supervisor is not null and e.supervisor.matricule = :supervisorMatricule))
              and (:search is null or :search = ''
                   or upper(e.fullName) like concat('%', upper(:search), '%')
                   or upper(e.matricule) like concat('%', upper(:search), '%'))
            order by cast(e.matricule as integer) asc
            """,
        countQuery = """
            select count(e) from Employee e
            where e.deleted = false
              and (:supervisorMatricule is null
                   or (e.supervisor is not null and e.supervisor.matricule = :supervisorMatricule))
              and (:search is null or :search = ''
                   or upper(e.fullName) like concat('%', upper(:search), '%')
                   or upper(e.matricule) like concat('%', upper(:search), '%'))
            """
    )
    Page<Employee> findPagedWithSearch(
            @Param("supervisorMatricule") String supervisorMatricule,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("""
<<<<<<< HEAD
        select e
        from Employee e
        join e.jobTitle jt
        where (e.deleted = false or e.deleted is null)
          and jt.title like '%SUPERVISEUR%'
    """)
    List<Employee> findAllSupervisors();

=======
    select new tn.sage.rh.employee.dto.SupervisorDto(
        e.id,
        e.matricule,
        e.fullName,
        d.name,
        jt.title
    )
    from Employee e
    join e.department d
    join e.jobTitle jt
    where e.deleted = false
      and exists (
          select 1
          from Employee op
          where op.supervisor = e
      )
      and d.name not in ('RESSOURCES HUMAINES','IT','MAINTENANCE')
""")
    List<SupervisorDto> findAllSupervisors();
>>>>>>> e39960116e8b13adc77c071927f1cdecf16443b2
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
<<<<<<< HEAD
}
=======

    @Query("""
    select
        pl.id as projectId,
        sup.id as supervisorId,
        sup.fullName as supervisorFullName,
        sup.matricule as supervisorMatricule,
        count(op.id) as operatorsCount
    from Employee op
    join op.productionLine pl
    join op.supervisor sup
    where (op.deleted = false or op.deleted is null)
      and (sup.deleted = false or sup.deleted is null)
    group by pl.id, sup.id, sup.fullName, sup.matricule
    order by pl.id asc, count(op.id) desc
""")
    List<ProjectBestSupervisorRow> findSupervisorCountsByProject();
}
>>>>>>> e39960116e8b13adc77c071927f1cdecf16443b2
