package tn.sage.rh.absence.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.absence.entity.Absence;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.List;

public interface AbsenceRepository extends JpaRepository<Absence, Long> {

    Optional<Absence> findByEmployee_MatriculeAndDate(String matricule, LocalDate date);

    @Query(
            value = """
            select a from Absence a
            join fetch a.employee e
            left join e.supervisor sup
            where
              (cast(:supervisorMatricule as string) is null or (sup is not null and sup.matricule = :supervisorMatricule))
              and (cast(:dateFrom as localdate) is null or a.date >= :dateFrom)
              and (cast(:dateTo as localdate)   is null or a.date <= :dateTo)
              and (cast(:horaire as string) is null or a.horaire = :horaire)
              and (cast(:search as string) is null
                   or upper(e.fullName)  like concat('%', upper(cast(:search as string)), '%')
                   or upper(e.matricule) like concat('%', upper(cast(:search as string)), '%'))
              and (cast(:statutFilter as string) is null
                or (:statutFilter = 'PRESENT'
                    and a.heureEntree is not null)
                or (:statutFilter = 'ABSENT'
                    and a.heureEntree is null
                    and (a.date < :today
                         or (a.date = :today and a.heureDebut <= :now)))
                or (:statutFilter = 'PENDING'
                    and a.heureEntree is null
                    and a.date = :today
                    and a.heureDebut > :now)
              )
            order by a.date desc, e.matricule asc
            """,
            countQuery = """
            select count(a) from Absence a
            join a.employee e
            left join e.supervisor sup
            where
              (cast(:supervisorMatricule as string) is null or (sup is not null and sup.matricule = :supervisorMatricule))
              and (cast(:dateFrom as localdate) is null or a.date >= :dateFrom)
              and (cast(:dateTo as localdate)   is null or a.date <= :dateTo)
              and (cast(:horaire as string) is null or a.horaire = :horaire)
              and (cast(:search as string) is null
                   or upper(e.fullName)  like concat('%', upper(cast(:search as string)), '%')
                   or upper(e.matricule) like concat('%', upper(cast(:search as string)), '%'))
              and (cast(:statutFilter as string) is null
                or (:statutFilter = 'PRESENT'
                    and a.heureEntree is not null)
                or (:statutFilter = 'ABSENT'
                    and a.heureEntree is null
                    and (a.date < :today
                         or (a.date = :today and a.heureDebut <= :now)))
                or (:statutFilter = 'PENDING'
                    and a.heureEntree is null
                    and a.date = :today
                    and a.heureDebut > :now)
              )
            """
    )
    Page<Absence> findPagedWithFilters(
            @Param("supervisorMatricule") String supervisorMatricule,
            @Param("dateFrom")     LocalDate dateFrom,
            @Param("dateTo")       LocalDate dateTo,
            @Param("horaire")      String horaire,
            @Param("search")       String search,
            @Param("statutFilter") String statutFilter,
            @Param("today")        LocalDate today,
            @Param("now")          LocalTime now,
            Pageable pageable
    );
    @Query("""
    select a.date,
           count(a),
           sum(case when a.heureEntree is not null then 1 else 0 end),
           sum(case when a.heureEntree is null and (a.date < :today or a.heureDebut <= :now) then 1 else 0 end),
           sum(case when a.heureEntree is null and a.date = :today and a.heureDebut > :now then 1 else 0 end)
    from Absence a
    group by a.date
    order by a.date desc
    """)
    List<Object[]> findHistorique(@Param("today") LocalDate today, @Param("now") LocalTime now);
}