package tn.sage.rh.absence.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.absence.dto.AbsenceDto;
import tn.sage.rh.absence.dto.AbsenceHistoriqueDto;
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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AbsenceService {

    private static final LocalTime HEURE_DEBUT_DEFAULT = LocalTime.of(6, 0);

    private final AbsenceRepository absenceRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public void batchSave(List<SaveAbsenceInputDto> inputs) {
        if (inputs == null || inputs.isEmpty()) return;

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

        List<Absence> toSave = new ArrayList<>();
        LocalTime now = LocalTime.now();

        for (SaveAbsenceInputDto input : deduped) {
            Employee employee = employeeMap.get(input.getMatricule());
            if (employee == null) continue;

            Absence absence = absenceRepository
                    .findByEmployee_MatriculeAndDate(input.getMatricule(), input.getDate())
                    .orElse(Absence.builder().employee(employee).date(input.getDate()).build());

            LocalTime heureDebut = input.getHeureDebut() != null
                    ? input.getHeureDebut()
                    : HEURE_DEBUT_DEFAULT;

            absence.setHoraire(input.getHoraire());
            absence.setHeureDebut(heureDebut);
            absence.setHeureFin(input.getHeureFin());
            absence.setHeureEntree(input.getHeureEntree());
            absence.setHeureSortie(input.getHeureSortie());
            absence.setMotif(input.getMotif());
            absence.setDepartement(input.getDepartement());

            AbsenceStatut statut;
            if (input.getHeureEntree() != null) {
                statut = AbsenceStatut.PRESENT;
            } else if (now.isBefore(heureDebut)) {
                statut = AbsenceStatut.PENDING;
            } else {
                statut = AbsenceStatut.ABSENT;
            }
            absence.setStatut(statut);

            toSave.add(absence);
        }

        absenceRepository.saveAll(toSave);
    }

    @Transactional
    public void save(SaveAbsenceInputDto input) {
        batchSave(List.of(input));
    }

    @Transactional(readOnly = true)
    public Page<Absence> findAllPaged(
            Principal connectedUser,
            LocalDate dateFrom, LocalDate dateTo,
            String statutFilter, String search,
            String supervisorFilter, String horaire,
            Pageable pageable) {

        User user = getUser(connectedUser);
        String supervisorMatricule;

        if (user.getRole() == UserRole.SUPERVISOR) {
            supervisorMatricule = user.getUsername();
        } else {
            supervisorMatricule = (supervisorFilter != null && !supervisorFilter.isBlank())
                    ? supervisorFilter.trim() : null;
        }

        String searchTerm  = (search  != null && !search.isBlank())  ? search.trim()  : null;
        String horaireTerm = (horaire != null && !horaire.isBlank()) ? horaire.trim() : null;
        String statutTerm  = (statutFilter != null && !statutFilter.isBlank()) ? statutFilter.trim() : null;
        LocalTime now = LocalTime.now();
        LocalDate today = LocalDate.now();

        System.out.println("=== NOW: " + now + " | TODAY: " + today + " | STATUT: " + statutTerm + " | DATE_FROM: " + dateFrom + " | DATE_TO: " + dateTo + " ===");

        return absenceRepository.findPagedWithFilters(
                supervisorMatricule, dateFrom, dateTo,
                horaireTerm, searchTerm, statutTerm,
                today,
                now,
                pageable);
    }

    @Transactional
    public AbsenceDto update(Long id, UpdateAbsenceDto dto, Principal connectedUser) {
        User user = getUser(connectedUser);

        Absence absence = absenceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Absence introuvable (id=" + id + ")", ErrorCodes.EMPLOYEE_NOT_FOUND));

        if (user.getRole() == UserRole.INFIRMIERE) {
            if (dto.getMotif() != null)
                absence.setMotif(dto.getMotif().isBlank() ? null : dto.getMotif().toUpperCase().trim());
        } else if (user.getRole() == UserRole.SUPERVISOR) {
            Employee supervisor = absence.getEmployee().getSupervisor();
            if (supervisor == null || !supervisor.getMatricule().equals(user.getUsername()))
                throw new AccessDeniedException("Vous ne pouvez modifier que les absences de vos opérateurs");
            if (dto.getStatut() != null) absence.setStatut(dto.getStatut());
        } else if (user.getRole() == UserRole.ADMIN) {
            if (dto.getMotif()       != null) absence.setMotif(dto.getMotif().isBlank() ? null : dto.getMotif().toUpperCase().trim());
            if (dto.getStatut()      != null) absence.setStatut(dto.getStatut());
            if (dto.getHeureEntree() != null) absence.setHeureEntree(dto.getHeureEntree());
            if (dto.getHeureSortie() != null) absence.setHeureSortie(dto.getHeureSortie());
        }

        absenceRepository.save(absence);
        return toDto(absence);
    }

    @Transactional
    public void delete(Long id) {
        if (!absenceRepository.existsById(id))
            throw new EntityNotFoundException("Absence introuvable (id=" + id + ")", ErrorCodes.EMPLOYEE_NOT_FOUND);
        absenceRepository.deleteById(id);
    }

    public AbsenceDto toDto(Absence a) {
        LocalTime now = LocalTime.now();
        LocalDate today = LocalDate.now();
        AbsenceStatut statut;

        if (a.getHeureEntree() != null) {
            statut = AbsenceStatut.PRESENT;
        } else if (a.getDate().equals(today)
                && a.getHeureDebut() != null
                && now.isBefore(a.getHeureDebut())) {
            statut = null;
        } else {
            statut = AbsenceStatut.ABSENT;
        }

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
                .statut(statut)
                .motif(a.getMotif())
                .build();
    }

    @Transactional(readOnly = true)
    public List<AbsenceHistoriqueDto> getHistorique() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        return absenceRepository.findHistorique(today, now)
                .stream()
                .map(row -> AbsenceHistoriqueDto.builder()
                        .date((LocalDate) row[0])
                        .total((long) row[1])
                        .present((long) row[2])
                        .absent((long) row[3])
                        .pending((long) row[4])
                        .build())
                .toList();
    }

    private User getUser(Principal principal) {
        return (User) ((UsernamePasswordAuthenticationToken) principal).getPrincipal();
    }
}