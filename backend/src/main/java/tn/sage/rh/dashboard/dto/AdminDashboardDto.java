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
}
