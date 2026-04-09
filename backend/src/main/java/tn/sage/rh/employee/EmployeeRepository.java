package tn.sage.rh.employee;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.employee.dto.SupervisorDto;
import tn.sage.rh.employee.projection.ProjectBestSupervisorRow;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    // Keep numeric matricules naturally ordered while safely supporting alphanumeric codes.
    String SAFE_MATRICULE_ORDER = """
        order by
          case
            when e.matricule is not null
             and function('translate', e.matricule, '0123456789', '') = ''
            then 0 else 1
          end asc,
          case
            when e.matricule is not null
             and function('translate', e.matricule, '0123456789', '') = ''
            then length(e.matricule) else 0
          end asc,
          upper(coalesce(e.matricule, '')) asc
    """;

    Optional<Employee> findByMatricule(String matricule);

    @Query("""
        select e from Employee e
        where e.deleted = false
          and e.departureDate is null
          and (e.hasLeftCompany = false or e.hasLeftCompany is null)
    """ + SAFE_MATRICULE_ORDER)
    @Override
    List<Employee> findAll();

    @Query(
            value = """
            select e from Employee e
            where e.deleted = false
              and e.departureDate is null
              and (e.hasLeftCompany = false or e.hasLeftCompany is null)
        """ + SAFE_MATRICULE_ORDER,
            countQuery = """
            select count(e) from Employee e
            where e.deleted = false
              and e.departureDate is null
              and (e.hasLeftCompany = false or e.hasLeftCompany is null)
        """
    )
    Page<Employee> findAllPaged(Pageable pageable);

    @Query("""
        select e
        from Employee e
        where e.deleted = false
          and e.departureDate is null
          and (e.hasLeftCompany = false or e.hasLeftCompany is null)
          and e.supervisor is not null
          and e.supervisor.matricule = :matricule
          and e.matricule <> :matricule
    """ + SAFE_MATRICULE_ORDER)
    List<Employee> findAllBySupervisor(@Param("matricule") String matricule);

    @Query(
            value = """
            select e from Employee e
            where e.deleted = false
              and e.departureDate is null
              and (e.hasLeftCompany = false or e.hasLeftCompany is null)
              and e.supervisor is not null
              and e.supervisor.matricule = :matricule
              and e.matricule <> :matricule
        """ + SAFE_MATRICULE_ORDER,
            countQuery = """
            select count(e) from Employee e
            where e.deleted = false
              and e.departureDate is null
              and (e.hasLeftCompany = false or e.hasLeftCompany is null)
              and e.supervisor is not null
              and e.supervisor.matricule = :matricule
              and e.matricule <> :matricule
        """
    )
    Page<Employee> findAllBySupervisorPaged(@Param("matricule") String matricule, Pageable pageable);

    @Query(
            value = """
            select e from Employee e
            left join e.productionLine pl
            left join e.shift sh
            left join e.employmentType et
            where e.deleted = false
              and (:supervisorMatricule is null
                   or (e.supervisor is not null and e.supervisor.matricule = :supervisorMatricule))
              and (:search is null or :search = ''
                   or upper(e.fullName) like concat('%', upper(:search), '%')
                   or upper(e.matricule) like concat('%', upper(:search), '%'))
              and (:productionLine is null or :productionLine = ''
                   or (pl is not null and upper(pl.name) = upper(:productionLine)))
              and (:shift is null or :shift = ''
                   or (sh is not null and upper(sh.name) = upper(:shift)))
              and (:employmentType is null or :employmentType = ''
                   or (et is not null and upper(et.type) = upper(:employmentType)))
              and (:hireDateFrom is null or e.hireDate >= :hireDateFrom)
              and (:hireDateTo is null or e.hireDate <= :hireDateTo)
              and (
                    :leftCompanyFilter is null
                    or (:leftCompanyFilter = 'CURRENT' and (e.hasLeftCompany = false or e.hasLeftCompany is null))
                    or (:leftCompanyFilter = 'FORMER' and e.hasLeftCompany = true)
                    or (:leftCompanyFilter = 'ALL')
                  )
        """ + SAFE_MATRICULE_ORDER,
            countQuery = """
            select count(e) from Employee e
            left join e.productionLine pl
            left join e.shift sh
            left join e.employmentType et
            where e.deleted = false
              and (:supervisorMatricule is null
                   or (e.supervisor is not null and e.supervisor.matricule = :supervisorMatricule))
              and (:search is null or :search = ''
                   or upper(e.fullName) like concat('%', upper(:search), '%')
                   or upper(e.matricule) like concat('%', upper(:search), '%'))
              and (:productionLine is null or :productionLine = ''
                   or (pl is not null and upper(pl.name) = upper(:productionLine)))
              and (:shift is null or :shift = ''
                   or (sh is not null and upper(sh.name) = upper(:shift)))
              and (:employmentType is null or :employmentType = ''
                   or (et is not null and upper(et.type) = upper(:employmentType)))
              and (:hireDateFrom is null or e.hireDate >= :hireDateFrom)
              and (:hireDateTo is null or e.hireDate <= :hireDateTo)
              and (
                    :leftCompanyFilter is null
                    or (:leftCompanyFilter = 'CURRENT' and (e.hasLeftCompany = false or e.hasLeftCompany is null))
                    or (:leftCompanyFilter = 'FORMER' and e.hasLeftCompany = true)
                    or (:leftCompanyFilter = 'ALL')
                  )
        """
    )
    Page<Employee> findPagedWithFilters(
            @Param("supervisorMatricule") String supervisorMatricule,
            @Param("search") String search,
            @Param("productionLine") String productionLine,
            @Param("shift") String shift,
            @Param("employmentType") String employmentType,
            @Param("hireDateFrom") LocalDate hireDateFrom,
            @Param("hireDateTo") LocalDate hireDateTo,
            @Param("leftCompanyFilter") String leftCompanyFilter,
            Pageable pageable
    );

    @Query("""
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
          and e.departureDate is null
          and (e.hasLeftCompany = false or e.hasLeftCompany is null)
          and exists (
              select 1
              from Employee op
              where op.supervisor = e
                and (op.deleted = false or op.deleted is null)
                and op.departureDate is null
                and (op.hasLeftCompany = false or op.hasLeftCompany is null)
          )
          and d.name not in ('RESSOURCES HUMAINES','IT','MAINTENANCE')
    """)
    List<SupervisorDto> findAllSupervisors();

    List<Employee> findAllByMatriculeIn(Collection<String> matricules);

    @Query("""
        select e
        from Employee e
        where (e.deleted = false or e.deleted is null)
          and e.departureDate is null
          and (e.hasLeftCompany = false or e.hasLeftCompany is null)
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
        and e.departureDate is null
        and (e.hasLeftCompany = false or e.hasLeftCompany is null)
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
        and e.departureDate is null
        and (e.hasLeftCompany = false or e.hasLeftCompany is null)
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

    boolean existsByEmailIgnoreCaseAndDeletedFalse(String email);

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
          and e.departureDate is null
          and (e.hasLeftCompany = false or e.hasLeftCompany is null)
        order by e.fullName asc
    """)
    List<Employee> findFreeOperators();

    @Query("""
      select e
      from Employee e
      left join fetch e.supervisor s
      where e.deleted = false
        and e.free = true
        and e.departureDate is null
        and (e.hasLeftCompany = false or e.hasLeftCompany is null)
    """)
    List<Employee> findFreeOperatorsWithSupervisor();

    @Modifying
    @Query("update Employee e set e.free = false")
    int resetFreeFalseForAll();

    @Query("""
        select e
        from Employee e
        where (e.deleted = false or e.deleted is null)
          and e.departureDate is null
          and (e.hasLeftCompany = false or e.hasLeftCompany is null)
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
    """ + SAFE_MATRICULE_ORDER)
    List<Employee> findMyOperatorsAvailableForDay(
            @Param("supervisorMatricule") String supervisorMatricule,
            @Param("day") LocalDate day,
            @Param("startTime") java.time.LocalTime startTime,
            @Param("endTime") java.time.LocalTime endTime
    );

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
          and op.departureDate is null
          and (op.hasLeftCompany = false or op.hasLeftCompany is null)
          and (sup.deleted = false or sup.deleted is null)
          and sup.departureDate is null
          and (sup.hasLeftCompany = false or sup.hasLeftCompany is null)
        group by pl.id, sup.id, sup.fullName, sup.matricule
        order by pl.id asc, count(op.id) desc
    """)
    List<ProjectBestSupervisorRow> findSupervisorCountsByProject();
    @Query("""
    select count(e)
    from Employee e
    where e.deleted = false
      and (:supervisorMatricule is null
           or (e.supervisor is not null and e.supervisor.matricule = :supervisorMatricule))
""")
    long countTotalEmployees(@Param("supervisorMatricule") String supervisorMatricule);

    @Query("""
    select count(e)
    from Employee e
    where e.deleted = false
      and (e.hasLeftCompany = false or e.hasLeftCompany is null)
      and (:supervisorMatricule is null
           or (e.supervisor is not null and e.supervisor.matricule = :supervisorMatricule))
""")
    long countCurrentEmployees(@Param("supervisorMatricule") String supervisorMatricule);

    @Query("""
    select count(e)
    from Employee e
    where e.deleted = false
      and e.hasLeftCompany = true
      and (:supervisorMatricule is null
           or (e.supervisor is not null and e.supervisor.matricule = :supervisorMatricule))
""")
    long countFormerEmployees(@Param("supervisorMatricule") String supervisorMatricule);
}
