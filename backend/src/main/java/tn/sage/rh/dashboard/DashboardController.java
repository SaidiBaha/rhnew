// tn/sage/rh/dashboard/DashboardController.java
package tn.sage.rh.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.dashboard.dto.AdminDashboardDto;
import tn.sage.rh.dashboard.dto.PermutationsDailyDTO;
import tn.sage.rh.dashboard.dto.ProjectHoursRowDTO;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/project-hours")
    public List<ProjectHoursRowDTO> projectHours(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "du", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
            @RequestParam(value = "au", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au
    ) {
        LocalDate f = (from != null) ? from : du;
        LocalDate t = (to != null) ? to : au;
        return dashboardService.computeProjectHours(f, t);
    }
    @GetMapping("/permutations-daily")
    public List<PermutationsDailyDTO> permutationsDaily(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to")   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return dashboardService.getPermutationsDaily(from, to);
    }

    @GetMapping("/admin")
    public AdminDashboardDto adminDashboard(
            @RequestParam(value = "period", defaultValue = "month") String period,
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return dashboardService.getAdminDashboard(period, from, to);
    }
}