package tn.sage.rh.permutations.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.organization.entity.ProductionLine;
import tn.sage.rh.organization.repository.ProductionLineRepository;
import tn.sage.rh.permutations.dto.PermutationCreateRequestDTO;
import tn.sage.rh.permutations.dto.PermutationResponseDTO;
import tn.sage.rh.permutations.entity.Permutation;
import tn.sage.rh.permutations.entity.PermutationStatus;
import tn.sage.rh.permutations.entity.TypePermutation;
import tn.sage.rh.permutations.mapper.PermutationMapper;
import tn.sage.rh.permutations.repository.PermutationRepository;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PermutationServiceImpl implements PermutationService {

    private final PermutationRepository permutationRepository;
    private final PermutationMapper mapper;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final ProductionLineRepository productionLineRepository;

    @Override
    public List<PermutationResponseDTO> getPermutationsForCurrentUser() {
        User current = getCurrentUser();

        if (isOperationalManger(current)) {
            return permutationRepository.findAllOrdered()
                    .stream()
                    .map(p -> toDtoWithRoleFlags(p, null))
                    .toList();
        }

        if (isSupervisor(current)) {
            Employee me = getCurrentEmployee(current);
            Long meId = me.getId();

            return permutationRepository.findInvolved(meId)
                    .stream()
                    .map(p -> toDtoWithRoleFlags(p, meId))
                    .toList();
        }

        throw new AccessDeniedException("Role not allowed");
    }

    private PermutationResponseDTO toDtoWithRoleFlags(Permutation p, Long currentEmployeeId) {
        PermutationResponseDTO dto = mapper.toDto(p);

        if (currentEmployeeId != null) {
            boolean asSender = p.getSenders() != null &&
                    p.getSenders().stream().anyMatch(s -> s != null && Objects.equals(s.getId(), currentEmployeeId));

            boolean asReceiver = p.getReceiver() != null
                    && Objects.equals(p.getReceiver().getId(), currentEmployeeId);

            dto.setAsSender(asSender);
            dto.setAsReceiver(asReceiver);
        } else {
            dto.setAsSender(false);
            dto.setAsReceiver(false);
        }

        return dto;
    }

    @Override
    public List<PermutationResponseDTO> create(PermutationCreateRequestDTO dto) {

        User current = getCurrentUser();
        if (!isSupervisor(current)) {
            throw new AccessDeniedException("Only SUPERVISOR can create permutations");
        }

        Employee me = getCurrentEmployee(current);

        if (dto.getStartTime() == null || dto.getEndTime() == null) {
            throw new IllegalArgumentException("startTime and endTime are required");
        }
        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw new IllegalArgumentException("endTime must be > startTime");
        }

        List<Long> operatorIds = dto.getOperatorIds();
        if (operatorIds == null || operatorIds.isEmpty()) {
            throw new IllegalArgumentException("operatorIds is required");
        }
        if (operatorIds.contains(me.getId())) {
            throw new IllegalArgumentException("Supervisor cannot be included in operatorIds.");
        }

        Map<Long, Employee> operatorMap = employeeRepository.findAllById(operatorIds)
                .stream()
                .collect(Collectors.toMap(Employee::getId, e -> e));

        for (Long opId : operatorIds) {
            if (!operatorMap.containsKey(opId)) {
                throw new NoSuchElementException("Operator not found: " + opId);
            }
        }

        Set<Employee> operators = new HashSet<>(operatorMap.values());

        ProductionLine productionLine = null;
        if (dto.getProductionLineId() != null) {
            productionLine = productionLineRepository.findById(dto.getProductionLineId())
                    .orElseThrow(() -> new NoSuchElementException("Production line not found: " + dto.getProductionLineId()));
        }

        if (dto.getTypePermutation() == TypePermutation.RECEVOIR) {

            LocalDate today = LocalDate.now();
            Employee receiver = me;

            // ✅ déduire senders depuis opérateurs.supervisor
            boolean hasNullSupervisor = operators.stream().anyMatch(op -> op.getSupervisor() == null);
            if (hasNullSupervisor) {
                throw new IllegalArgumentException("Certains opérateurs n'ont pas de superviseur.");
            }

            Set<Employee> senders = operators.stream()
                    .map(Employee::getSupervisor)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            // ✅ overlap check
            for (Employee op : operators) {
                boolean overlap = permutationRepository.existsOverlap(
                        op.getId(),
                        PermutationStatus.ACCEPTEE,
                        today,
                        today,
                        dto.getStartTime(),
                        dto.getEndTime()
                );
                if (overlap) {
                    throw new IllegalArgumentException("Operator " + op.getId() + " is not available in this period");
                }
            }

            Permutation p = Permutation.builder()
                    .receiver(receiver)
                    .senders(senders)
                    .operators(operators)
                    .productionLine(productionLine)
                    .startDate(today)
                    .endDate(today)
                    .startTime(dto.getStartTime())
                    .endTime(dto.getEndTime())
                    .status(PermutationStatus.EN_ATTENTE)
                    .typePermutation(TypePermutation.RECEVOIR)
                    .build();

            return List.of(mapper.toDto(permutationRepository.save(p)));
        }

        // ================= ENVOYER =================
        if (dto.getStartDate() == null || dto.getEndDate() == null) {
            throw new IllegalArgumentException("startDate and endDate are required for ENVOYER");
        }
        if (dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new IllegalArgumentException("endDate must be >= startDate");
        }
        if (dto.getReceiverId() == null) {
            throw new IllegalArgumentException("receiverId is required for ENVOYER");
        }
        if (Objects.equals(dto.getReceiverId(), me.getId())) {
            throw new IllegalArgumentException("Receiver cannot be the same as sender");
        }

        Employee receiver = employeeRepository.findById(dto.getReceiverId())
                .orElseThrow(() -> new NoSuchElementException("Receiver not found: " + dto.getReceiverId()));

        for (Employee op : operators) {
            boolean overlap = permutationRepository.existsOverlap(
                    op.getId(),
                    PermutationStatus.ACCEPTEE,
                    dto.getStartDate(),
                    dto.getEndDate(),
                    dto.getStartTime(),
                    dto.getEndTime()
            );
            if (overlap) {
                throw new IllegalArgumentException("Operator " + op.getId() + " is not available in this period");
            }
        }

        Set<Employee> senders = new HashSet<>();
        senders.add(me);

        Permutation p = Permutation.builder()
                .receiver(receiver)
                .senders(senders)
                .operators(operators)
                .productionLine(productionLine)
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .status(PermutationStatus.EN_ATTENTE)
                .typePermutation(TypePermutation.ENVOYER)
                .build();

        return List.of(mapper.toDto(permutationRepository.save(p)));
    }

    @Override
    public PermutationResponseDTO accept(Long id) {
        return updateStatus(id, PermutationStatus.ACCEPTEE);
    }

    @Override
    public PermutationResponseDTO refuse(Long id) {
        return updateStatus(id, PermutationStatus.REFUSEE);
    }

    private PermutationResponseDTO updateStatus(Long id, PermutationStatus status) {
        User current = getCurrentUser();
        if (!isSupervisor(current)) {
            throw new AccessDeniedException("Only SUPERVISOR can validate permutations");
        }

        Employee me = getCurrentEmployee(current);

        Permutation p = permutationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Permutation not found"));

        // ✅ receiver validates
        if (!Objects.equals(p.getReceiver().getId(), me.getId())) {
            throw new AccessDeniedException("Only receiver can validate this permutation");
        }

        if (p.getStatus() != PermutationStatus.EN_ATTENTE) {
            throw new IllegalArgumentException("Only EN_ATTENTE permutations can be updated");
        }

        if (status == PermutationStatus.ACCEPTEE) {
            List<Long> blocked = new ArrayList<>();
            for (Employee op : p.getOperators()) {
                boolean overlap = permutationRepository.existsOverlap(
                        op.getId(),
                        PermutationStatus.ACCEPTEE,
                        p.getStartDate(),
                        p.getEndDate(),
                        p.getStartTime(),
                        p.getEndTime()
                );
                if (overlap) blocked.add(op.getId());
            }

            if (!blocked.isEmpty()) {
                p.setStatus(PermutationStatus.REFUSEE);
                Permutation saved = permutationRepository.save(p);

                PermutationResponseDTO dto = mapper.toDto(saved);
                dto.setAutoRefusedMessage(
                        "Impossible d'accepter : opérateur(s) déjà pris sur cette période : "
                                + blocked
                                + ". La permutation a été automatiquement refusée."
                );
                return dto;
            }

            // ✅ Mettre free = false pour tous les opérateurs concernés
            for (Employee operator : p.getOperators()) {
                operator.setFree(false);
            }
            // Sauvegarder les modifications des opérateurs
            employeeRepository.saveAll(p.getOperators());
        }

        p.setStatus(status);
        Permutation saved = permutationRepository.save(p);
        return mapper.toDto(saved);
    }
    /* ---------- helpers ---------- */

    private User getCurrentUser() {
        String matricule = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmployee_Matricule(matricule)
                .orElseThrow(() -> new NoSuchElementException("User not found for matricule: " + matricule));
    }

    private Employee getCurrentEmployee(User user) {
        if (user.getEmployee() == null) {
            throw new IllegalStateException("Current user has no linked employee");
        }
        return user.getEmployee();
    }

    private boolean isSupervisor(User user) {
        return user.getRole() != null && "SUPERVISOR".equals(user.getRole().name());
    }

    private boolean isOperationalManger(User user) {
        return user.getRole() != null && "OPERATIONAL_MANAGER".equals(user.getRole().name());
    }
}
