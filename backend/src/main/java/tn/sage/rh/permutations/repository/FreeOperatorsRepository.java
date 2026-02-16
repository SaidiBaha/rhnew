package tn.sage.rh.permutations.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.permutations.entity.FreeOperators;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FreeOperatorsRepository extends JpaRepository<FreeOperators, Long> {

    @Query("""
        select fo
        from FreeOperators fo
        where fo.endDate < :today
    """)
    List<FreeOperators> findExpired(@Param("today") LocalDate today);

    // on évite doublons (matricule unique)
    Optional<FreeOperators> findByMatricule(String matricule);

    // liste des free actifs pour une date (aujourd'hui)
    @Query("""
        select fo
        from FreeOperators fo
        where fo.startDate <= :day and fo.endDate >= :day
    """)
    List<FreeOperators> findActiveForDay(@Param("day") LocalDate day);
}
