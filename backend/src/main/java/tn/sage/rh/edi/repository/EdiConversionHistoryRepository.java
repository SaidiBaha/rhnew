package tn.sage.rh.edi.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.sage.rh.edi.model.EdiConversionHistory;

import java.util.Optional;

@Repository
public interface EdiConversionHistoryRepository extends JpaRepository<EdiConversionHistory, Long> {

    /** Tout l'historique — pour SUPER_ADMIN */
    Page<EdiConversionHistory> findAllByOrderByConvertedAtDesc(Pageable pageable);

    /** Historique d'un seul utilisateur — pour PLANIFICATEUR */
    Page<EdiConversionHistory> findByConvertedByMatriculeOrderByConvertedAtDesc(
            String matricule, Pageable pageable);

    /** Contrôle d'accès au re-téléchargement */
    Optional<EdiConversionHistory> findByIdAndConvertedByMatricule(Long id, String matricule);
}
