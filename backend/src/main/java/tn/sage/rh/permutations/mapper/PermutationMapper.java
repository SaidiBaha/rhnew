// tn/sage/rh/permutations/mapper/PermutationMapper.java
package tn.sage.rh.permutations.mapper;

import org.springframework.stereotype.Component;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.organization.entity.ProductionLine;
import tn.sage.rh.permutations.dto.PermutationResponseDTO;
import tn.sage.rh.permutations.entity.Permutation;
import tn.sage.rh.user.User;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class PermutationMapper {

    public PermutationResponseDTO toDto(Permutation p, Long connectedEmployeeId) {
        if (p == null) return null;

        Employee receiver = p.getReceiver();

        // ✅ 1) operatorsWithSupervisors
        List<PermutationResponseDTO.OperatorWithSupervisorDTO> opWithSup =
                buildOperatorsWithSupervisors(p.getOperators());

        // ✅ 2) senders FROM DB (may contain only one)
        List<Employee> sendersFromDb = (p.getSenders() == null)
                ? List.of()
                : p.getSenders().stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(Employee::getFullName, String.CASE_INSENSITIVE_ORDER))
                .toList();

        // ✅ 3) senders derived from operatorsWithSupervisors (unique supervisors)
        List<PermutationResponseDTO.OperatorWithSupervisorDTO> distinctSupDtos = distinctSupervisors(opWithSup);

        // ✅ 4) choose which list to expose as senders:
        // - If DB has multiple senders, use it
        // - else fallback to derived supervisors (best for your case)
        boolean dbHasMultiple = sendersFromDb.size() > 1;
        List<Long> senderIds;
        List<String> senderFullNames;
        List<String> senderMatricules;

        if (dbHasMultiple) {
            senderIds = sendersFromDb.stream().map(Employee::getId).toList();
            senderFullNames = sendersFromDb.stream().map(Employee::getFullName).toList();
            senderMatricules = sendersFromDb.stream().map(Employee::getMatricule).toList();
        } else {
            senderIds = distinctSupDtos.stream()
                    .map(PermutationResponseDTO.OperatorWithSupervisorDTO::getSupervisorId)
                    .filter(Objects::nonNull)
                    .toList();

            senderFullNames = distinctSupDtos.stream()
                    .map(PermutationResponseDTO.OperatorWithSupervisorDTO::getSupervisorFullName)
                    .filter(Objects::nonNull)
                    .toList();

            senderMatricules = distinctSupDtos.stream()
                    .map(PermutationResponseDTO.OperatorWithSupervisorDTO::getSupervisorMatricule)
                    .filter(Objects::nonNull)
                    .toList();
        }

        // ✅ flags (connected user)
        boolean asReceiver = connectedEmployeeId != null
                && receiver != null
                && Objects.equals(receiver.getId(), connectedEmployeeId);

        // ✅ IMPORTANT: asSender must work with multi senders
        boolean asSender = connectedEmployeeId != null
                && senderIds.stream().anyMatch(id -> Objects.equals(id, connectedEmployeeId));

        return PermutationResponseDTO.builder()
                .id(p.getId())

                .operatorIds(extractEmployeeIds(p.getOperators()))
                .operatorNames(extractEmployeeNames(p.getOperators()))
                .operators(extractEmployeeDtos(p.getOperators()))

                // ✅ operator -> supervisor pairs
                .operatorsWithSupervisors(opWithSup)

                // ✅ receiver
                .receiverId(idOfEmployee(receiver))
                .receiverFullName(receiver != null ? receiver.getFullName() : null)
                .receiverMatricule(receiver != null ? receiver.getMatricule() : null)

                // ✅ senders (multi)
                .senderIds(senderIds)
                .senderFullNames(senderFullNames)
                .senderMatricules(senderMatricules)

                .productionLineId(idOfProductionLine(p.getProductionLine()))

                .startDate(p.getStartDate())
                .endDate(p.getEndDate())
                .startTime(p.getStartTime())
                .endTime(p.getEndTime())

                .status(p.getStatus())
                .typePermutation(p.getTypePermutation())

                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .createdByUserId(idOfUser(p.getCreatedBy()))
                .updatedByUserId(idOfUser(p.getUpdatedBy()))

                .asSender(asSender)
                .asReceiver(asReceiver)

                .autoRefusedMessage(null)
                .build();
    }

    public PermutationResponseDTO toDto(Permutation p) {
        return toDto(p, null);
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------

    private List<PermutationResponseDTO.OperatorWithSupervisorDTO> buildOperatorsWithSupervisors(Set<Employee> operators) {
        if (operators == null || operators.isEmpty()) return List.of();

        return operators.stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(Employee::getFullName, String.CASE_INSENSITIVE_ORDER))
                .map(op -> {
                    Employee sup = op.getSupervisor();
                    return PermutationResponseDTO.OperatorWithSupervisorDTO.builder()
                            .operatorId(op.getId())
                            .operatorFullName(op.getFullName())
                            .operatorMatricule(op.getMatricule())
                            .supervisorId(sup != null ? sup.getId() : null)
                            .supervisorFullName(sup != null ? sup.getFullName() : null)
                            .supervisorMatricule(sup != null ? sup.getMatricule() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ✅ Return unique supervisors (keep first occurrence order)
    private List<PermutationResponseDTO.OperatorWithSupervisorDTO> distinctSupervisors(
            List<PermutationResponseDTO.OperatorWithSupervisorDTO> opWithSup
    ) {
        if (opWithSup == null || opWithSup.isEmpty()) return List.of();

        LinkedHashMap<Long, PermutationResponseDTO.OperatorWithSupervisorDTO> map = new LinkedHashMap<>();

        for (PermutationResponseDTO.OperatorWithSupervisorDTO x : opWithSup) {
            if (x == null) continue;
            Long supId = x.getSupervisorId();
            if (supId == null) continue;
            map.putIfAbsent(supId, x);
        }

        // Optional: sort by supervisorFullName if you prefer alphabetical
        return map.values().stream()
                .sorted(Comparator.comparing(
                        a -> Optional.ofNullable(a.getSupervisorFullName()).orElse(""),
                        String.CASE_INSENSITIVE_ORDER
                ))
                .toList();
    }

    private List<Long> extractEmployeeIds(Set<Employee> employees) {
        if (employees == null || employees.isEmpty()) return List.of();
        return employees.stream().filter(Objects::nonNull).map(Employee::getId).toList();
    }

    private List<String> extractEmployeeNames(Set<Employee> employees) {
        if (employees == null || employees.isEmpty()) return List.of();
        return employees.stream()
                .filter(Objects::nonNull)
                .map(Employee::getFullName)
                .filter(Objects::nonNull)
                .toList();
    }

    private List<EmployeeDto> extractEmployeeDtos(Set<Employee> employees) {
        if (employees == null || employees.isEmpty()) return List.of();
        return employees.stream()
                .filter(Objects::nonNull)
                .map(e -> EmployeeDto.builder()
                        .id(e.getId())
                        .fullName(e.getFullName())
                        .matricule(e.getMatricule())
                        .build())
                .toList();
    }

    private Long idOfEmployee(Employee e) { return e == null ? null : e.getId(); }
    private Long idOfProductionLine(ProductionLine pl) { return pl == null ? null : pl.getId(); }
    private Long idOfUser(User u) { return u == null ? null : u.getId(); }
}
