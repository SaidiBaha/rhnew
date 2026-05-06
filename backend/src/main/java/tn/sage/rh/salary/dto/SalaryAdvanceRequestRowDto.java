package tn.sage.rh.salary.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import tn.sage.rh.salary.entity.SalaryAdvanceRequestStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class SalaryAdvanceRequestRowDto {
    private Long id;
    private Long requesterId;
    private String requesterMatricule;
    private String requesterFullName;
    private BigDecimal amount;
    private String comment;
    private SalaryAdvanceRequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime processedAt;
    private String processedByFullName;
}
