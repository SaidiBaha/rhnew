package tn.sage.rh.permutations.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.permutations.dto.MarkFreeOperatorsRequestDTO;
import tn.sage.rh.permutations.entity.FreeOperators;
import tn.sage.rh.permutations.entity.PermutationStatus;
import tn.sage.rh.permutations.repository.FreeOperatorsRepository;
import tn.sage.rh.permutations.repository.PermutationRepository;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FreeOperatorsServiceImpl implements FreeOperatorsService {

    private final EmployeeRepository employeeRepository;
    private final FreeOperatorsRepository freeOperatorsRepository;
    private final UserRepository userRepository;

    // ✅ Bloquer les opérateurs déjà en permutation sur le même créneau
    private final PermutationRepository permutationRepository;

    /**
     * ✅ 1) Marquer des opérateurs FREE pour un jour + créneau
     * - Autorisé seulement pour SUPERVISOR
     * - Bloque ceux déjà en permutation (ACCEPTEE) sur le même jour + créneau
     * - Upsert FreeOperators (matricule unique)
     * - Si day == today : met Employee.free = true directement
     */
    @Override
    public void markFreeForDay(MarkFreeOperatorsRequestDTO dto) {

        User current = getCurrentUser();
        if (!isSupervisor(current)) {
            throw new AccessDeniedException("Only SUPERVISOR can mark operators as free");
        }

        if (dto.getDay() == null) {
            throw new IllegalArgumentException("day is required");
        }

        if (dto.getOperatorIds() == null || dto.getOperatorIds().isEmpty()) {
            throw new IllegalArgumentException("operatorIds is required");
        }

        if (dto.getStartTime() == null || dto.getEndTime() == null) {
            throw new IllegalArgumentException("startTime and endTime are required");
        }
        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw new IllegalArgumentException("endTime must be > startTime");
        }

        // ✅ charger opérateurs
        List<Employee> ops = employeeRepository.findAllById(dto.getOperatorIds());

        Set<Long> found = ops.stream().map(Employee::getId).collect(Collectors.toSet());
        for (Long id : dto.getOperatorIds()) {
            if (!found.contains(id)) throw new NoSuchElementException("Operator not found: " + id);
        }

        List<Long> formerOperatorIds = ops.stream()
                .filter(this::hasLeftCompany)
                .map(Employee::getId)
                .toList();

        if (!formerOperatorIds.isEmpty()) {
            throw new IllegalArgumentException(
                    "Impossible de marquer FREE : employé(s) ayant quitté la société : " + formerOperatorIds
            );
        }

        LocalDate day = dto.getDay();

        // ✅ Bloquer ceux déjà en permutation ACCEPTEE sur ce jour + créneau
        List<Long> blocked = new ArrayList<>();
        for (Employee op : ops) {
            boolean overlap = permutationRepository.existsOverlap(
                    op.getId(),
                    PermutationStatus.ACCEPTEE,
                    day,
                    day,
                    dto.getStartTime(),
                    dto.getEndTime()
            );
            if (overlap) blocked.add(op.getId());
        }

        if (!blocked.isEmpty()) {
            throw new IllegalArgumentException(
                    "Impossible de marquer FREE : opérateur(s) déjà en permutation sur ce créneau : " + blocked
            );
        }

        // ✅ Upsert FreeOperators (matricule unique)
        for (Employee op : ops) {
            String matricule = op.getMatricule();
            if (matricule == null || matricule.isBlank()) {
                throw new IllegalStateException("Operator has no matricule: " + op.getId());
            }

            FreeOperators fo = freeOperatorsRepository.findByMatricule(matricule)
                    .orElseGet(() -> FreeOperators.builder().matricule(matricule).build());

            fo.setFullName(op.getFullName());
            fo.setStartDate(day);
            fo.setEndDate(day);
            fo.setStartTime(dto.getStartTime());
            fo.setEndTime(dto.getEndTime());

            // ✅ Table FreeOperators = planning de disponibilité (tu peux garder ACCEPTEE)
            fo.setStatus(PermutationStatus.ACCEPTEE);

            freeOperatorsRepository.save(fo);
        }

        // ✅ Si c'est pour aujourd'hui → active directement employee.free=true
        if (Objects.equals(day, LocalDate.now())) {
            List<String> matricules = ops.stream()
                    .map(Employee::getMatricule)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();

            if (!matricules.isEmpty()) {
                employeeRepository.markFreeTrueByMatricules(matricules);
            }
        }
    }

    /**
     * ✅ 2) NEW: Récupérer les opérateurs ÉLIGIBLES à être marqués FREE
     * - Seulement pour SUPERVISOR
     * - Retourne uniquement les opérateurs du superviseur connecté
     * - Exclut ceux déjà en permutation (ACCEPTEE) sur le jour + créneau demandé
     *
     * ⚠️ Nécessite une méthode repository:
     * employeeRepository.findMyOperatorsAvailableForDay(supervisorMatricule, day, startTime, endTime)
     */
    @Override
    @Transactional
    public List<EmployeeDto> getEligibleOperatorsForFree(LocalDate day, LocalTime startTime, LocalTime endTime) {

        User current = getCurrentUser();
        if (!isSupervisor(current)) {
            throw new AccessDeniedException("Only SUPERVISOR can view eligible operators");
        }

        if (day == null) throw new IllegalArgumentException("day is required");
        if (startTime == null || endTime == null) throw new IllegalArgumentException("startTime/endTime are required");
        if (!endTime.isAfter(startTime)) throw new IllegalArgumentException("endTime must be > startTime");

        // IMPORTANT: dans ton app, username = matricule (vu findAllBySupervisor(user.getUsername()))
        String supervisorMatricule = current.getUsername();

        List<Employee> eligible = employeeRepository.findMyOperatorsAvailableForDay(
                supervisorMatricule,
                day,
                startTime,
                endTime
        );

        return eligible.stream()
                .map(e -> EmployeeDto.builder()
                        .id(e.getId())
                        .fullName(e.getFullName())
                        .matricule(e.getMatricule())
                        .free(e.isFree())
                        .build())
                .toList();
    }

    /* ------------ helpers auth ------------ */

    private User getCurrentUser() {
        String matricule = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmployee_Matricule(matricule)
                .orElseThrow(() -> new NoSuchElementException("User not found for matricule: " + matricule));
    }
//updaaatees
    private boolean isSupervisor(User user) {
        return user.getRole() != null && "SUPERVISOR".equals(user.getRole().name());
    }

    private boolean hasLeftCompany(Employee employee) {
        return employee != null
                && (Boolean.TRUE.equals(employee.getHasLeftCompany()) || employee.getDepartureDate() != null);
    }
}
