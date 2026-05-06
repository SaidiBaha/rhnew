package tn.sage.rh.dashboard.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AdminDashboardDto {
    private PresenceSectionDto presence;
    private AdvanceSectionDto advances;
    private AlertsSectionDto alerts;
    private List<RecentAdvanceDto> recentAdvances;
    private List<RecentAbsenceDto> recentAbsences;
    /** Superviseurs n'ayant pas encore complété leurs avances (max 5 pour le dashboard). */
    private List<SupervisorPendingRowDto> supervisorsPending;
}
