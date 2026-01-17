package tn.sage.rh.permutations.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.permutations.entity.Permutation;
import tn.sage.rh.permutations.entity.PermutationStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface PermutationRepository extends JpaRepository<Permutation, Long> {

    @Query("""
        select distinct p
        from Permutation p
        left join fetch p.operators ops
        left join fetch p.sender s
        left join fetch p.receiver r
        where p.sender.id = :employeeId
           or p.receiver.id = :employeeId
           or ops.id = :employeeId
        order by p.createdAt desc
    """)
    List<Permutation> findInvolved(@Param("employeeId") Long employeeId);

    @Query("""
        select distinct p
        from Permutation p
        left join fetch p.operators ops
        left join fetch p.sender s
        left join fetch p.receiver r
        order by p.createdAt desc
    """)
    List<Permutation> findAllOrdered();

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
}
