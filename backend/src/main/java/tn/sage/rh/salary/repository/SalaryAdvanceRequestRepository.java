package tn.sage.rh.salary.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.salary.entity.SalaryAdvanceRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SalaryAdvanceRequestRepository extends JpaRepository<SalaryAdvanceRequest, Long> {

    @Query("""
        select sar
        from SalaryAdvanceRequest sar
        join fetch sar.requester requester
        left join fetch sar.processedBy processedBy
        left join fetch processedBy.employee processedByEmployee
        where requester.id = :requesterId
        order by sar.createdAt desc
    """)
    List<SalaryAdvanceRequest> findAllByRequesterIdOrderByCreatedAtDesc(@Param("requesterId") Long requesterId);

    @Query("""
        select sar
        from SalaryAdvanceRequest sar
        join fetch sar.requester requester
        left join fetch sar.processedBy processedBy
        left join fetch processedBy.employee processedByEmployee
        order by sar.createdAt desc
    """)
    List<SalaryAdvanceRequest> findAllDetailedOrderByCreatedAtDesc();

    @Query("""
        select sar
        from SalaryAdvanceRequest sar
        join fetch sar.requester requester
        left join fetch requester.department dept
        left join fetch sar.processedBy processedBy
        left join fetch processedBy.employee processedByEmployee
        where sar.createdAt >= :startOfYear
          and sar.createdAt < :startOfNextYear
        order by sar.createdAt asc
    """)
    List<SalaryAdvanceRequest> findAllByCreatedYear(
            @Param("startOfYear") LocalDateTime startOfYear,
            @Param("startOfNextYear") LocalDateTime startOfNextYear
    );

    @Query("""
        select sar
        from SalaryAdvanceRequest sar
        join fetch sar.requester requester
        left join fetch requester.department dept
        left join fetch sar.processedBy processedBy
        left join fetch processedBy.employee processedByEmployee
        where sar.createdAt >= :from
          and sar.createdAt <= :to
        order by sar.createdAt desc
    """)
    List<SalaryAdvanceRequest> findAllByCreatedAtBetween(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    @Query("select max(sar.createdAt) from SalaryAdvanceRequest sar where sar.status = 'EN_COURS' and sar.createdAt < :threshold")
    Optional<LocalDateTime> findOldestEnCoursCreatedAt(@Param("threshold") LocalDateTime threshold);

    /**
     * Charge toutes les demandes accordées (DONE) dont processedAt est dans l'intervalle.
     * Utilisé par le dashboard admin pour Carte 1 (employés distincts accordés) et Carte 2 (montant total accordé).
     */
    @Query("""
        select sar
        from SalaryAdvanceRequest sar
        join fetch sar.requester requester
        where sar.status = 'DONE'
          and sar.processedAt >= :from
          and sar.processedAt <= :to
    """)
    List<SalaryAdvanceRequest> findAllDoneByProcessedAtBetween(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );
}
