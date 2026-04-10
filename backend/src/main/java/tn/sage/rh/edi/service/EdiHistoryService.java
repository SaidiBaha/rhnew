package tn.sage.rh.edi.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import tn.sage.rh.edi.exception.EdiParsingException;
import tn.sage.rh.edi.model.EdiConversionHistory;
import tn.sage.rh.edi.repository.EdiConversionHistoryRepository;
import tn.sage.rh.user.UserRole;

@Service
@RequiredArgsConstructor
public class EdiHistoryService {

    private final EdiConversionHistoryRepository historyRepository;

    public EdiConversionHistory save(EdiConversionHistory entry) {
        return historyRepository.save(entry);
    }

    /**
     * Retourne l'historique paginé selon le rôle :
     * - SUPER_ADMIN → tout l'historique, tous utilisateurs
     * - PLANIFICATEUR → uniquement ses propres conversions
     */
    public Page<EdiConversionHistory> getHistory(String matricule, UserRole role, Pageable pageable) {
        if (role == UserRole.SUPER_ADMIN) {
            return historyRepository.findAllByOrderByConvertedAtDesc(pageable);
        }
        return historyRepository.findByConvertedByMatriculeOrderByConvertedAtDesc(matricule, pageable);
    }

    /**
     * Retourne une entrée pour re-téléchargement avec contrôle d'accès :
     * - SUPER_ADMIN → n'importe quelle entrée
     * - PLANIFICATEUR → uniquement ses propres entrées
     */
    public EdiConversionHistory getForDownload(Long id, String matricule, UserRole role) {
        if (role == UserRole.SUPER_ADMIN) {
            return historyRepository.findById(id)
                    .orElseThrow(() -> new EdiParsingException("Historique introuvable : id=" + id));
        }
        return historyRepository.findByIdAndConvertedByMatricule(id, matricule)
                .orElseThrow(() -> new AccessDeniedException(
                        "Accès refusé : vous ne pouvez télécharger que vos propres fichiers."));
    }
}
