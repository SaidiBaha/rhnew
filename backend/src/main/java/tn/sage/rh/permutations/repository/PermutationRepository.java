package tn.sage.rh.permutations.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.permutations.entity.Permutation;
import tn.sage.rh.permutations.entity.PermutationStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface PermutationRepository extends JpaRepository<Permutation, Long> {

    // ✅ IMPORTANT: fetch senders/receiver/operators/productionLine
    @Query("""
        select distinct p
        from Permutation p
        left join fetch p.senders s
        left join fetch p.operators o
        join fetch p.receiver r
        left join fetch p.productionLine pl
        order by p.createdAt desc
    """)
    List<Permutation> findAllOrdered();

    // ✅ IMPORTANT: join fetch pour éviter senders vides
    @Query("""
        select distinct p
        from Permutation p
        left join fetch p.senders s
        left join fetch p.operators o
        join fetch p.receiver r
        left join fetch p.productionLine pl
        where (r.id = :meId or s.id = :meId)
        order by p.createdAt desc
    """)
    List<Permutation> findInvolved(@Param("meId") Long meId);

    @Query("""
        select (count(p) > 0)
        from Permutation p
        join p.operators o
        where o.id = :operatorId
          and p.status = :status
          and p.startDate <= :endDate
          and p.endDate >= :startDate
          and (p.startTime < :endTime and p.endTime > :startTime)
    """)
    boolean existsOverlap(
            @Param("operatorId") Long operatorId,
            @Param("status") PermutationStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    // ✅ petit fix: ajouter @Param + éviter bug binding
    @Query("""
        select e from Employee e
        where e.free = true
          and e.deleted = false
          and (e.supervisor is null or e.supervisor.id <> :supervisorId)
    """)
    List<Employee> findFreeOperatorsExcludingMyOperators(@Param("supervisorId") Long supervisorId);
}
