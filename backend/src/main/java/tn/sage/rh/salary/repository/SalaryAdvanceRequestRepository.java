package tn.sage.rh.salary.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.salary.entity.SalaryAdvanceRequest;

import java.time.LocalDateTime;
import java.util.List;

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
}
