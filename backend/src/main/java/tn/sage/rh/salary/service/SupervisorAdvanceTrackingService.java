package tn.sage.rh.salary.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.attendance.entity.AttendanceImport;
import tn.sage.rh.attendance.repository.AttendanceImportRepository;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.notification.service.NotificationService;
import tn.sage.rh.salary.dto.SupervisorTrackingRowDto;
import tn.sage.rh.salary.dto.SupervisorTrackingStatsDto;
import tn.sage.rh.salary.entity.SupervisorAdvanceTracking;
import tn.sage.rh.salary.repository.SalaryAdvanceRepository;
import tn.sage.rh.salary.repository.SupervisorAdvanceTrackingRepository;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;
import tn.sage.rh.user.UserRole;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupervisorAdvanceTrackingService {

    private final SupervisorAdvanceTrackingRepository trackingRepository;
    private final AttendanceImportRepository importRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final SalaryAdvanceRepository salaryAdvanceRepository;
    private final NotificationService notificationService;

    private static final ZoneId TZ = ZoneId.of("Africa/Tunis");

    /**
     * Appelé après chaque import XLSX réussi.
     * - Enregistre l'import dans attendance_imports.
     * - Crée une entrée de tracking EN_ATTENTE pour chaque superviseur actif.
     * - Envoie une notification IN-APP à tous les superviseurs.
     */
    @Transactional
    public AttendanceImport onAttendanceImported(Long importedByUserId, LocalDate importDate,
                                                 String fichierNom, int nbLignes) {
        // 1. Enregistrer l'import
        AttendanceImport attendanceImport = AttendanceImport.builder()
                .importedBy(importedByUserId)
                .importDate(importDate)
                .importedAt(LocalDateTime.now(TZ))
                .fichierNom(fichierNom)
                .nbLignes(nbLignes)
                .build();
        attendanceImport = importRepository.save(attendanceImport);
        final String importId = attendanceImport.getId();

        // 2. Créer un tracking EN_ATTENTE pour chaque superviseur actif
        List<User> supervisors = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.SUPERVISOR
                          && u.getEmployee() != null
                          && !u.getEmployee().isDeleted())
                .toList();

        for (User supervisor : supervisors) {
            // Nombre d'employés rattachés à ce superviseur
            int nbEmployees = (int) employeeRepository.countBySupervisorMatricule(
                    supervisor.getEmployee().getMatricule());

            // Supprimer tout tracking existant pour ce superviseur sur cet import (réinitialisation)
            trackingRepository.findBySupervisorIdAndAttendanceImportId(supervisor.getId(), importId)
                    .ifPresent(trackingRepository::delete);

            SupervisorAdvanceTracking tracking = SupervisorAdvanceTracking.builder()
                    .supervisorId(supervisor.getId())
                    .attendanceImportId(importId)
                    .nbEmployees(nbEmployees)
                    .nbAvancesSaisies(0)
                    .montantTotal(BigDecimal.ZERO)
                    .statut("EN_ATTENTE")
                    .rappelEnvoye(false)
                    .build();
            trackingRepository.save(tracking);
        }

        // 3. Envoyer notification à tous les superviseurs
        String dateStr = importDate.toString();
        List<Long> supervisorIds = supervisors.stream().map(User::getId).toList();
        notificationService.createForAll(
                supervisorIds,
                "Saisie des avances requise",
                "Le fichier de pointage du " + dateStr + " a été importé. " +
                "Veuillez saisir et sauvegarder les avances de votre équipe dans le module Avances sur salaire.",
                "/salary-advances"
        );

        log.info("Import pointage enregistré (id={}) — {} trackings créés, {} notifications envoyées",
                importId, supervisors.size(), supervisors.size());

        return attendanceImport;
    }

    /**
     * Appelé après chaque batchUpdate d'avances par un superviseur.
     * Met à jour le tracking pour ce superviseur sur le dernier import.
     * @param nbEligibles nombre d'employés éligibles (champ non disabled) dans le batch courant
     */
    @Transactional
    public void onAdvancesSaved(Long supervisorId, int nbEligibles) {
        Optional<AttendanceImport> latestImport = importRepository.findLatest();
        if (latestImport.isEmpty()) {
            log.debug("Aucun import connu, tracking ignoré pour supervisorId={}", supervisorId);
            return;
        }

        String importId = latestImport.get().getId();

        Optional<SupervisorAdvanceTracking> existingOpt =
                trackingRepository.findBySupervisorIdAndAttendanceImportId(supervisorId, importId);

        if (existingOpt.isEmpty()) {
            log.debug("Aucun tracking trouvé pour supervisorId={}, importId={}", supervisorId, importId);
            return;
        }

        SupervisorAdvanceTracking tracking = existingOpt.get();
        User supervisor = userRepository.findById(supervisorId).orElse(null);
        if (supervisor == null || supervisor.getEmployee() == null) return;

        // Recalcul : avances saisies (montant > 0 ET mois courant)
        YearMonth currentYearMonth = YearMonth.now(TZ);
        int month = currentYearMonth.getMonthValue();
        int year = currentYearMonth.getYear();

        Long empId = supervisor.getEmployee().getId();

        int nbSaisies = salaryAdvanceRepository
                .countSavedBySupervisorAndMonthAndYear(empId, month, year);
        BigDecimal total = salaryAdvanceRepository
                .sumAmountBySupervisorAndMonthAndYear(empId, month, year);

        tracking.setNbAvancesSaisies(nbSaisies);
        tracking.setMontantTotal(total != null ? total : BigDecimal.ZERO);
        tracking.setDerniereActionAt(LocalDateTime.now(TZ));

        // Recalcul statut — basé sur les employés éligibles (champ non disabled)
        if (nbSaisies == 0) {
            tracking.setStatut("EN_ATTENTE");
        } else if (nbEligibles > 0 && nbSaisies >= nbEligibles) {
            tracking.setStatut("COMPLETE");
        } else {
            tracking.setStatut("PARTIEL");
        }

        trackingRepository.save(tracking);
        log.debug("Tracking mis à jour: supervisorId={}, statut={}", supervisorId, tracking.getStatut());
    }

    /**
     * Retourne les stats + la liste complète des superviseurs pour la page de suivi.
     */
    @Transactional(readOnly = true)
    public SupervisorTrackingStatsDto getStats() {
        Optional<AttendanceImport> latestImport = importRepository.findLatest();
        if (latestImport.isEmpty()) {
            return SupervisorTrackingStatsDto.builder()
                    .nbCompleted(0)
                    .nbMissing(0)
                    .totalAmount(BigDecimal.ZERO)
                    .rows(List.of())
                    .build();
        }

        AttendanceImport imp = latestImport.get();
        List<SupervisorAdvanceTracking> trackings = trackingRepository.findAllByAttendanceImportId(imp.getId());

        List<SupervisorTrackingRowDto> rows = trackings.stream()
                .map(t -> buildRow(t, imp))
                .toList();

        int nbCompleted = (int) trackings.stream().filter(t -> "COMPLETE".equals(t.getStatut())).count();
        int nbMissing = trackings.size() - nbCompleted;
        BigDecimal totalAmount = trackings.stream()
                .map(t -> t.getMontantTotal() != null ? t.getMontantTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return SupervisorTrackingStatsDto.builder()
                .nbCompleted(nbCompleted)
                .nbMissing(nbMissing)
                .totalAmount(totalAmount)
                .lastImportAt(imp.getImportedAt())
                .lastImportId(imp.getId())
                .rows(rows)
                .build();
    }

    /**
     * Envoie manuellement une notification de relance à un superviseur spécifique.
     */
    @Transactional
    public void sendManualReminder(String trackingId) {
        SupervisorAdvanceTracking tracking = trackingRepository.findById(trackingId)
                .orElseThrow(() -> new IllegalArgumentException("Tracking introuvable: " + trackingId));

        Optional<AttendanceImport> imp = importRepository.findById(tracking.getAttendanceImportId());
        String dateStr = imp.map(i -> i.getImportDate().toString()).orElse("inconnue");

        notificationService.create(
                tracking.getSupervisorId(),
                "Rappel — Avances non complétées",
                "Rappel : vous n'avez pas encore saisi les avances de votre équipe " +
                "pour le pointage du " + dateStr + ". Merci de les compléter dès que possible.",
                "/salary-advances"
        );

        log.info("Relance manuelle envoyée: supervisorId={}", tracking.getSupervisorId());
    }

    /**
     * Envoi automatique des rappels 24h pour les superviseurs qui n'ont pas encore complété.
     * Appelé par le scheduler horaire.
     */
    @Transactional
    public void sendAutomaticReminders() {
        Optional<AttendanceImport> latestImport = importRepository.findLatest();
        if (latestImport.isEmpty()) return;

        AttendanceImport imp = latestImport.get();
        // Ne déclencher que si l'import date de plus de 24h
        if (imp.getImportedAt() == null ||
            imp.getImportedAt().isAfter(LocalDateTime.now(TZ).minusHours(24))) {
            return;
        }

        List<SupervisorAdvanceTracking> pending =
                trackingRepository.findPendingWithoutReminderForImport(imp.getId());

        for (SupervisorAdvanceTracking tracking : pending) {
            String dateStr = imp.getImportDate() != null ? imp.getImportDate().toString() : "inconnue";

            notificationService.create(
                    tracking.getSupervisorId(),
                    "Rappel — Avances non complétées",
                    "Rappel : vous n'avez pas encore saisi les avances de votre équipe " +
                    "pour le pointage du " + dateStr + ". Merci de les compléter dès que possible.",
                    "/salary-advances"
            );

            tracking.setRappelEnvoye(true);
            tracking.setRappelEnvoyeAt(LocalDateTime.now(TZ));
            trackingRepository.save(tracking);
        }

        if (!pending.isEmpty()) {
            log.info("Rappels automatiques 24h envoyés: {} superviseurs", pending.size());
        }
    }

    // ─── private helpers ─────────────────────────────────────────────────────

    private SupervisorTrackingRowDto buildRow(SupervisorAdvanceTracking t, AttendanceImport imp) {
        User supervisor = userRepository.findById(t.getSupervisorId()).orElse(null);
        String matricule = supervisor != null && supervisor.getEmployee() != null
                ? supervisor.getEmployee().getMatricule() : "—";
        String fullName = supervisor != null && supervisor.getEmployee() != null
                ? supervisor.getEmployee().getFullName() : "—";
        String dept = supervisor != null && supervisor.getEmployee() != null
                && supervisor.getEmployee().getDepartment() != null
                ? supervisor.getEmployee().getDepartment().getName() : "—";

        return SupervisorTrackingRowDto.builder()
                .trackingId(t.getId())
                .supervisorId(t.getSupervisorId())
                .supervisorMatricule(matricule)
                .supervisorFullName(fullName)
                .department(dept)
                .nbEmployees(t.getNbEmployees())
                .nbAvancesSaisies(t.getNbAvancesSaisies())
                .montantTotal(t.getMontantTotal())
                .statut(t.getStatut())
                .derniereActionAt(t.getDerniereActionAt())
                .attendanceImportId(imp.getId())
                .importedAt(imp.getImportedAt())
                .build();
    }
}
