package tn.sage.rh.permutations.dto;

import lombok.*;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.permutations.entity.PermutationStatus;
import tn.sage.rh.permutations.entity.TypePermutation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class PermutationResponseDTO {

    private Long id;

    private List<Long> operatorIds;

    private Long senderId;
    private Long receiverId;

    private String senderFullName;
    private String receiverFullName;

    private String senderMatricule;
    private String receiverMatricule;

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
    private List<String> operatorNames;

    private List<EmployeeDto> operators;


}

