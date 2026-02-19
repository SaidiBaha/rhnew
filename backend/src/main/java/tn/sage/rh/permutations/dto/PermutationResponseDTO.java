// tn/sage/rh/permutations/dto/PermutationResponseDTO.java
package tn.sage.rh.permutations.dto;

import lombok.*;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.permutations.entity.PermutationStatus;
import tn.sage.rh.permutations.entity.TypePermutation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PermutationResponseDTO {

    private Long id;

    private List<Long> operatorIds;
    private List<String> operatorNames;
    private List<EmployeeDto> operators;

    // ✅ NEW: operator -> supervisor mapping
    private List<OperatorWithSupervisorDTO> operatorsWithSupervisors;

    // ✅ receiver
    private Long receiverId;
    private String receiverFullName;
    private String receiverMatricule;

    // ✅ senders list
    private List<Long> senderIds;
    private List<String> senderFullNames;
    private List<String> senderMatricules;

    private Long productionLineId;

    private LocalDate startDate;
    private LocalDate endDate;

    private LocalTime startTime;
    private LocalTime endTime;

    private PermutationStatus status;
    private TypePermutation typePermutation;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Long createdByUserId;
    private Long updatedByUserId;

    private boolean asSender;
    private boolean asReceiver;

    private String autoRefusedMessage;

    // ✅ Inner DTO (ou fichier séparé si tu préfères)
    @Getter @Setter
    @NoArgsConstructor @AllArgsConstructor
    @Builder
    public static class OperatorWithSupervisorDTO {
        private Long operatorId;
        private String operatorFullName;
        private String operatorMatricule;

        private Long supervisorId;
        private String supervisorFullName;
        private String supervisorMatricule;
    }
}
