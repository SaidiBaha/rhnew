package tn.sage.rh.salary.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import tn.sage.rh.salary.entity.SalaryAdvanceRequestStatus;

@Getter
@Setter
@Builder
public class SalaryAdvanceRequestStatusUpdateDto {
    private SalaryAdvanceRequestStatus status;
}
