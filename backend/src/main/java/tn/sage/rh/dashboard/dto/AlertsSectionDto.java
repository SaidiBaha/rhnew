package tn.sage.rh.dashboard.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AlertsSectionDto {
    private List<UnjustifiedAbsenceAlertDto> unjustifiedAbsences;
    private List<PendingAdvanceAlertDto> pendingAdvances;
    private String lastImportDate;
}
