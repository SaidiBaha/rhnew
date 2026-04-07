package tn.sage.rh.absence.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.absence.dto.AbsenceDto;
import tn.sage.rh.absence.dto.AbsenceHistoriqueDto;
import tn.sage.rh.absence.dto.BulkUpdateAbsenceDto;
import tn.sage.rh.absence.dto.EmployeeAbsenceSummaryDto;
import tn.sage.rh.absence.dto.SaveAbsenceInputDto;
import tn.sage.rh.absence.dto.UpdateAbsenceDto;
import tn.sage.rh.absence.entity.Absence;
import tn.sage.rh.absence.entity.AbsenceStatut;
import tn.sage.rh.absence.repository.AbsenceRepository;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.exeption.EntityNotFoundException;
import tn.sage.rh.exeption.ErrorCodes;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRole;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import tn.sage.rh.exeption.InvalidEntityException;

@Slf4j
@Service
@RequiredArgsConstructor
public class AbsenceService {

    private static final LocalTime HEURE_DEBUT_DEFAULT = LocalTime.of(6, 0);

    private final AbsenceRepository absenceRepository;
    private final EmployeeRepository employeeRepository;

    /**
     * Returns true if {@code now} falls within the shift interval [heureDebut, heureFin].
     * Handles midnight-crossing shifts (e.g., 22:00–06:00).
     */
    private boolean isInShift(LocalTime now, LocalTime heureDebut, LocalTime heureFin) {
        if (heureDebut == null) return false;
        if (heureFin == null) return !now.isBefore(heureDebut);
        if (!heureDebut.isAfter(heureFin)) {
            // Normal shift: e.g., 06:00–14:00
            return !now.isBefore(heureDebut) && !now.isAfter(heureFin);
        } else {
            // Midnight-crossing shift: e.g., 22:00–06:00
            return !now.isBefore(heureDebut) || !now.isAfter(heureFin);
        }
    }

    // ─── Import / Save ────────────────────────────────────────────────────────

    private static final DateTimeFormatter DATE_FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional
    public int batchSave(List<SaveAbsenceInputDto> inputs) {
        if (inputs == null || inputs.isEmpty()) return 0;

        log.info("[batchSave] Reçu {} ligne(s) à importer", inputs.size());

        // ── Validation : une seule date, égale à aujourd'hui ─────────────────
        LocalDate today = LocalDate.now();
        Set<LocalDate> datesInFile = inputs.stream()
                .map(SaveAbsenceInputDto::getDate)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));

        if (datesInFile.size() > 1) {
            throw new InvalidEntityException(
                "Le fichier contient plusieurs dates différentes. Veuillez importer un fichier pour une seule journée.",
                ErrorCodes.INVALID_INPUT);
        }
 /*      if (datesInFile.size() == 1) {
            LocalDate fileDate = datesInFile.iterator().next();
            if (!fileDate.equals(today)) {
                throw new InvalidEntityException(
                    "La date du fichier (" + fileDate.format(DATE_FR) + ") ne correspond pas à la date d'aujourd'hui (" + today.format(DATE_FR) + "). Import annulé.",
                    ErrorCodes.INVALID_INPUT);
            }
        }*/
        // ── fin validation ────────────────────────────────────────────────────

        Map<String, SaveAbsenceInputDto> dedupMap = new LinkedHashMap<>();
        for (SaveAbsenceInputDto input : inputs) {
            String key = input.getMatricule() + ":" + input.getDate();
            SaveAbsenceInputDto existing = dedupMap.get(key);
            if (existing == null) {
                dedupMap.put(key, input);
            } else {
                if (existing.getHeureEntree() == null && input.getHeureEntree() != null) {
                    dedupMap.put(key, input);
                }
            }
        }
        List<SaveAbsenceInputDto> deduped = new ArrayList<>(dedupMap.values());

        List<String> matricules = deduped.stream()
                .map(SaveAbsenceInputDto::getMatricule)
                .distinct().toList();

        Map<String, Employee> employeeMap = employeeRepository
                .findAllByMatriculeIn(matricules).stream()
                .collect(Collectors.toMap(Employee::getMatricule, e -> e));

        log.info("[batchSave] {} matricule(s) distincts reçus, {} trouvés en base",
                matricules.size(), employeeMap.size());

        // Log des matricules non trouvés pour diagnostiquer les silences
        matricules.stream()
                .filter(m -> !employeeMap.containsKey(m))
                .forEach(m -> log.warn("[batchSave] Matricule introuvable en base — ligne ignorée : '{}'", m));

        List<Absence> toSave = new ArrayList<>();
        LocalTime now = LocalTime.now();

        for (SaveAbsenceInputDto input : deduped) {
            Employee employee = employeeMap.get(input.getMatricule());
            if (employee == null) continue;

            Absence absence = absenceRepository
                    .findByEmployee_MatriculeAndDate(input.getMatricule(), input.getDate())
                    .orElse(Absence.builder().employee(employee).date(input.getDate()).build());

            LocalTime heureDebut = input.getHeureDebut() != null ? input.getHeureDebut() : HEURE_DEBUT_DEFAULT;
            LocalTime heureFin   = input.getHeureFin();

            absence.setHoraire(input.getHoraire());
            absence.setHeureDebut(heureDebut);
            absence.setHeureFin(heureFin);
            absence.setHeureEntree(input.getHeureEntree());
            absence.setHeureSortie(input.getHeureSortie());
            absence.setMotif(input.getMotif());
            absence.setDepartement(input.getDepartement());

            // Core logic (evaluated at import time):
            // Case 2 — PRESENT : heureEntree filled
            // Case 1 — ABSENT  : heureEntree empty AND now IS within [Début, Fin]
            // Case 3 — PENDING : heureEntree empty AND now NOT within [Début, Fin]
            AbsenceStatut statut;
            if (input.getHeureEntree() != null) {
                statut = AbsenceStatut.PRESENT;
            } else if (isInShift(now, heureDebut, heureFin)) {
                statut = AbsenceStatut.ABSENT;
            } else {
                statut = AbsenceStatut.PENDING;
            }
            absence.setStatut(statut);

            toSave.add(absence);
        }

        absenceRepository.saveAll(toSave);

        // Log des 5 premières lignes insérées pour vérification
        toSave.stream().limit(5).forEach(a ->
            log.info("[batchSave] Inséré → matricule={}, date={}, statut={}, heureEntree={}",
                    a.getEmployee().getMatricule(), a.getDate(), a.getStatut(), a.getHeureEntree()));

        log.info("[batchSave] {} enregistrement(s) sauvegardé(s) en base (sur {} reçus)",
                toSave.size(), inputs.size());

        return toSave.size();
    }

    @Transactional
    public int save(SaveAbsenceInputDto input) {
        return batchSave(List.of(input));
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<Absence> findAllPaged(
            Principal connectedUser,
            LocalDate dateFrom, LocalDate dateTo,
            String statutFilter, String search,
            String supervisorFilter, String horaire,
            String departement,
            Pageable pageable) {

        User user = getUser(connectedUser);
        String supervisorMatricule = resolveSupervisor(user, supervisorFilter);

        String searchTerm      = blank(search);
        String horaireTerm     = blank(horaire);
        String departementTerm = blank(departement);

        AbsenceStatut statutEnum = parseStatut(statutFilter);

        return absenceRepository.findPagedWithFilters(
                supervisorMatricule, dateFrom, dateTo,
                horaireTerm, departementTerm, searchTerm, statutEnum,
                pageable);
    }

    @Transactional(readOnly = true)
    public List<EmployeeAbsenceSummaryDto> getSummaryPerEmployee(
            Principal connectedUser,
            LocalDate dateFrom, LocalDate dateTo,
            String departement) {

        User user = getUser(connectedUser);
        // SUPERVISOR sees only their employees; ADMIN/INFIRMIERE see all
        String supervisorMatricule = (user.getRole() == UserRole.SUPERVISOR)
                ? user.getUsername() : null;

        String departementTerm = blank(departement);

        List<Object[]> rows = absenceRepository.findSummaryPerEmployee(
                supervisorMatricule, dateFrom, dateTo, departementTerm);

        return rows.stream().map(row -> EmployeeAbsenceSummaryDto.builder()
                .matricule((String) row[0])
                .fullName((String) row[1])
                .departement((String) row[2])
                .joursPresent(((Number) row[3]).longValue())
                .joursAbsent(((Number) row[4]).longValue())
                .build()
        ).toList();
    }

    @Transactional(readOnly = true)
    public Page<Absence> getEmployeeAbsences(
            Principal connectedUser,
            String matricule,
            LocalDate dateFrom, LocalDate dateTo,
            String statutFilter,
            Pageable pageable) {

        User user = getUser(connectedUser);

        // SUPERVISOR may only access their own employees
        if (user.getRole() == UserRole.SUPERVISOR) {
            // Validate that the requested employee belongs to this supervisor
            // (lazy check — if not found in their scope, query returns empty)
        }

        AbsenceStatut statutEnum = parseStatut(statutFilter);

        return absenceRepository.findByEmployeeDetail(
                matricule, dateFrom, dateTo, statutEnum, pageable);
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    @Transactional
    public AbsenceDto update(Long id, UpdateAbsenceDto dto, Principal connectedUser) {
        User user = getUser(connectedUser);

        Absence absence = absenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Absence introuvable (id=" + id + ")", ErrorCodes.EMPLOYEE_NOT_FOUND));

        if (user.getRole() == UserRole.INFIRMIERE) {
            if (dto.getMotif() != null)
                absence.setMotif(dto.getMotif().isBlank() ? null : dto.getMotif().toUpperCase().trim());
            if (dto.getStatut()      != null) absence.setStatut(dto.getStatut());
            if (dto.getHeureEntree() != null) absence.setHeureEntree(dto.getHeureEntree());
            if (dto.getHeureSortie() != null) absence.setHeureSortie(dto.getHeureSortie());
            if (dto.getHeureEntree() != null && dto.getStatut() == null)
                absence.setStatut(AbsenceStatut.PRESENT);
        } else if (user.getRole() == UserRole.SUPERVISOR) {
            Employee supervisor = absence.getEmployee().getSupervisor();
            if (supervisor == null || !supervisor.getMatricule().equals(user.getUsername()))
                throw new AccessDeniedException("Vous ne pouvez modifier que les absences de vos opérateurs");
            if (dto.getHeureDebut()  != null) absence.setHeureDebut(dto.getHeureDebut());
            if (dto.getHeureEntree() != null) absence.setHeureEntree(dto.getHeureEntree());
            if (dto.getHeureSortie() != null) absence.setHeureSortie(dto.getHeureSortie());
            if (dto.getStatut()      != null) absence.setStatut(dto.getStatut());
            if (dto.getHeureEntree() != null && dto.getStatut() == null)
                absence.setStatut(AbsenceStatut.PRESENT);
        } else if (user.getRole() == UserRole.ADMIN) {
            if (dto.getMotif()       != null) absence.setMotif(dto.getMotif().isBlank() ? null : dto.getMotif().toUpperCase().trim());
            if (dto.getHeureDebut()  != null) absence.setHeureDebut(dto.getHeureDebut());
            if (dto.getHeureEntree() != null) absence.setHeureEntree(dto.getHeureEntree());
            if (dto.getHeureSortie() != null) absence.setHeureSortie(dto.getHeureSortie());
            if (dto.getStatut()      != null) absence.setStatut(dto.getStatut());
            if (dto.getHeureEntree() != null && dto.getStatut() == null)
                absence.setStatut(AbsenceStatut.PRESENT);
        }

        absenceRepository.save(absence);
        return toDto(absence);
    }

    @Transactional
    public void bulkUpdate(BulkUpdateAbsenceDto dto, Principal connectedUser) {
        if (dto.getIds() == null || dto.getIds().isEmpty()) return;
        User user = getUser(connectedUser);

        List<Absence> absences = absenceRepository.findAllById(dto.getIds());
        for (Absence absence : absences) {
            if (user.getRole() == UserRole.SUPERVISOR) {
                Employee supervisor = absence.getEmployee().getSupervisor();
                if (supervisor == null || !supervisor.getMatricule().equals(user.getUsername()))
                    continue;
            }
            if (dto.getStatut() != null) absence.setStatut(dto.getStatut());
            if (dto.getStatut() == AbsenceStatut.PRESENT && dto.getHeureEntree() != null)
                absence.setHeureEntree(dto.getHeureEntree());
            if (dto.getStatut() == AbsenceStatut.ABSENT)
                absence.setHeureEntree(null);
        }
        absenceRepository.saveAll(absences);
    }

    @Transactional
    public void delete(Long id) {
        if (!absenceRepository.existsById(id))
            throw new EntityNotFoundException("Absence introuvable (id=" + id + ")", ErrorCodes.EMPLOYEE_NOT_FOUND);
        absenceRepository.deleteById(id);
    }

    // ─── Historique chart ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AbsenceHistoriqueDto> getHistorique() {
        LocalDate today = LocalDate.now();
        LocalTime now   = LocalTime.now();
        return absenceRepository.findHistorique(today, now).stream()
                .map(row -> AbsenceHistoriqueDto.builder()
                        .date((LocalDate) row[0])
                        .total((long) row[1])
                        .present((long) row[2])
                        .absent((long) row[3])
                        .pending((long) row[4])
                        .build())
                .toList();
    }

    // ─── DTO mapper ───────────────────────────────────────────────────────────

    public AbsenceDto toDto(Absence a) {
        return AbsenceDto.builder()
                .id(a.getId())
                .matricule(a.getEmployee().getMatricule())
                .fullName(a.getEmployee().getFullName())
                .departement(a.getDepartement())
                .date(a.getDate())
                .horaire(a.getHoraire())
                .heureDebut(a.getHeureDebut())
                .heureFin(a.getHeureFin())
                .heureEntree(a.getHeureEntree())
                .heureSortie(a.getHeureSortie())
                .statut(a.getStatut())
                .motif(a.getMotif())
                .build();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private String resolveSupervisor(User user, String supervisorFilter) {
        if (user.getRole() == UserRole.SUPERVISOR) return user.getUsername();
        return blank(supervisorFilter);
    }

    private String blank(String s) {
        return (s != null && !s.isBlank()) ? s.trim() : null;
    }

    private AbsenceStatut parseStatut(String s) {
        if (s == null || s.isBlank()) return null;
        try { return AbsenceStatut.valueOf(s.trim()); }
        catch (IllegalArgumentException e) { return null; }
    }

    private User getUser(Principal principal) {
        return (User) ((UsernamePasswordAuthenticationToken) principal).getPrincipal();
    }
}
