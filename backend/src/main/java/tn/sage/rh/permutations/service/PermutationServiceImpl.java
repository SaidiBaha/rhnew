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
import tn.sage.rh.permutations.mapper.PermutationMapper;
import tn.sage.rh.permutations.repository.PermutationRepository;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

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
    /**
     * Enrichit le DTO avec des flags asSender / asReceiver
     */
    private PermutationResponseDTO toDtoWithRoleFlags(Permutation p, Long currentEmployeeId) {
        PermutationResponseDTO dto = mapper.toDto(p);

        if (currentEmployeeId != null) {
            boolean asSender = p.getSender() != null
                    && Objects.equals(p.getSender().getId(), currentEmployeeId);
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

        Employee sender = getCurrentEmployee(current);

        if (dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new IllegalArgumentException("endDate must be >= startDate");
        }
        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw new IllegalArgumentException("endTime must be > startTime");
        }
        if (Objects.equals(dto.getReceiverId(), sender.getId())) {
            throw new IllegalArgumentException("Receiver cannot be the same as sender");
        }

        Employee receiver = employeeRepository.findById(dto.getReceiverId())
                .orElseThrow(() -> new NoSuchElementException("Receiver not found: " + dto.getReceiverId()));

        ProductionLine productionLine = null;
        if (dto.getProductionLineId() != null) {
            productionLine = productionLineRepository.findById(dto.getProductionLineId())
                    .orElseThrow(() -> new NoSuchElementException(
                            "Production line not found: " + dto.getProductionLineId()));
        }

        List<Long> operatorIds = dto.getOperatorIds();
        if (operatorIds == null || operatorIds.isEmpty()) {
            throw new IllegalArgumentException("operatorIds is required");
        }

        Map<Long, Employee> operatorMap = employeeRepository.findAllById(operatorIds)
                .stream()
                .collect(Collectors.toMap(Employee::getId, e -> e));

        for (Long opId : operatorIds) {
            if (!operatorMap.containsKey(opId)) {
                throw new NoSuchElementException("Operator not found: " + opId);
            }
        }

        for (Long opId : operatorIds) {
            Employee operator = operatorMap.get(opId);

            boolean overlap = permutationRepository.existsOverlap(
                    operator.getId(),
                    PermutationStatus.ACCEPTEE,
                    dto.getStartDate(),
                    dto.getEndDate(),
                    dto.getStartTime(),
                    dto.getEndTime()
            );

            if (overlap) {
                throw new IllegalArgumentException(
                        "Operator " + operator.getId() + " is not available in this period");
            }
        }

        Set<Employee> operators = new HashSet<>(operatorMap.values());

        Permutation permutation = Permutation.builder()
                .sender(sender)
                .receiver(receiver)
                .productionLine(productionLine)
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .status(PermutationStatus.EN_ATTENTE)
                .operators(operators)
                .build();

        Permutation saved = permutationRepository.save(permutation);

        return List.of(mapper.toDto(saved));
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

    private boolean isAdmin(User user) {
        return user.getRole() != null && "ADMIN".equals(user.getRole().name());
    }

    private boolean isSupervisor(User user) {
        return user.getRole() != null && "SUPERVISOR".equals(user.getRole().name());
    }
private boolean isOperationalManger(User user) {
        return user.getRole() != null && "OPERATIONAL_MANAGER".equals(user.getRole().name());
    }

}
