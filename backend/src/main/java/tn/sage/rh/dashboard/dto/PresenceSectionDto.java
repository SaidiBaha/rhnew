package tn.sage.rh.dashboard.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PresenceSectionDto {
    private long totalEmployees;
    private long presentToday;
    private long absentToday;
    private long pendingToday;
    private double rateToday;
    private long deltaPresentVsPrev;
    private long deltaAbsentVsPrev;
    private List<EvolutionPointDto> chartEvolution;
    private List<DeptAbsenceDto> chartByDept;
}
