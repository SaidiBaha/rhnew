package tn.sage.rh.permutations.mapper;

import org.springframework.stereotype.Component;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.organization.entity.ProductionLine;
import tn.sage.rh.permutations.dto.PermutationResponseDTO;
import tn.sage.rh.permutations.entity.Permutation;
import tn.sage.rh.user.User;

import java.util.List;
import java.util.Set;

@Component
public class PermutationMapper {

    public PermutationResponseDTO toDto(Permutation p) {
        if (p == null) return null;

        Employee sender = p.getSender();
        Employee receiver = p.getReceiver();

        return PermutationResponseDTO.builder()
                .id(p.getId())

                .operatorIds(extractEmployeeIds(p.getOperators()))
                .operatorNames(extractEmployeeNames(p.getOperators()))
                .operators(extractEmployeeDtos(p.getOperators()))

                .senderId(idOfEmployee(sender))
                .receiverId(idOfEmployee(receiver))
                .productionLineId(idOfProductionLine(p.getProductionLine()))

                .senderFullName(sender != null ? sender.getFullName() : null)
                .receiverFullName(receiver != null ? receiver.getFullName() : null)
                .senderMatricule(sender != null ? sender.getMatricule() : null)
                .receiverMatricule(receiver != null ? receiver.getMatricule() : null)

                .startDate(p.getStartDate())
                .endDate(p.getEndDate())
                .startTime(p.getStartTime())
                .endTime(p.getEndTime())
                .status(p.getStatus())

                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())

                .createdByUserId(idOfUser(p.getCreatedBy()))
                .updatedByUserId(idOfUser(p.getUpdatedBy()))
                .build();
    }

    /* ---------- helpers ---------- */

    private List<Long> extractEmployeeIds(Set<Employee> employees) {
        if (employees == null || employees.isEmpty()) return List.of();
        return employees.stream()
                .map(Employee::getId)
                .toList();
    }

    private List<String> extractEmployeeNames(Set<Employee> employees) {
        if (employees == null || employees.isEmpty()) return List.of();
        return employees.stream()
                .map(Employee::getFullName)
                .toList();
    }

    private List<EmployeeDto> extractEmployeeDtos(Set<Employee> employees) {
        if (employees == null || employees.isEmpty()) return List.of();
        return employees.stream()
                .map(e -> EmployeeDto.builder()
                        .id(e.getId())
                        .fullName(e.getFullName())
                        .matricule(e.getMatricule())
                        .build()
                )
                .toList();
    }

    private Long idOfEmployee(Employee e) {
        return e == null ? null : e.getId();
    }

    private Long idOfProductionLine(ProductionLine pl) {
        return pl == null ? null : pl.getId();
    }

    private Long idOfUser(User u) {
        return u == null ? null : u.getId();
    }
}
