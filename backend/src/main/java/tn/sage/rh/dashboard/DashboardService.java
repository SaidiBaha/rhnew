// tn/sage/rh/dashboard/DashboardService.java
package tn.sage.rh.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.attendance.entity.Attendance;
import tn.sage.rh.attendance.repository.AttendanceRepository;
import tn.sage.rh.dashboard.dto.*;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.organization.dto.ProductionLineMinimalDto;
import tn.sage.rh.organization.entity.ProductionLine;
import tn.sage.rh.organization.repository.ProductionLineRepository;
import tn.sage.rh.organization.service.ProductionLineService;
import tn.sage.rh.permutations.entity.Permutation;
import tn.sage.rh.permutations.entity.PermutationStatus;
import tn.sage.rh.permutations.repository.PermutationRepository;
import tn.sage.rh.employee.projection.ProjectBestSupervisorRow;
import tn.sage.rh.salary.entity.SalaryAdvanceRequest;
import tn.sage.rh.salary.entity.SalaryAdvanceRequestStatus;
import tn.sage.rh.salary.repository.SalaryAdvanceRequestRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final PermutationRepository permutationRepository;
    private final EmployeeRepository employeeRepository;
    private final ProductionLineRepository productionLineRepository; // Gardé car utilisé dans resolveProjectName() pour les entités
    private final ProductionLineService productionLineService;
    private final AttendanceRepository attendanceRepository;
    private final SalaryAdvanceRequestRepository salaryAdvanceRequestRepository;

    private static final ZoneId TZ = ZoneId.of("Africa/Tunis");
    private static final DateTimeFormatter DAY_FMT  = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter WEEK_FMT = DateTimeFormatter.ofPattern("'S'ww yyyy");
    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("MMM yy", Locale.FRENCH);
    private static final DateTimeFormatter ISO_DATE   = DateTimeFormatter.ISO_LOCAL_DATE;

    // =========================================================================
    // ADMIN DASHBOARD
    // =========================================================================

    @Transactional(readOnly = true)
    public AdminDashboardDto getAdminDashboard(String period, LocalDate customFrom, LocalDate customTo) {

        LocalDate today = LocalDate.now(TZ);

        // ── 1. Compute current period date range ──────────────────────────────
        LocalDate periodFrom;
        LocalDate periodTo;
        LocalDate prevFrom;
        LocalDate prevTo;

        switch (period == null ? "month" : period.toLowerCase()) {
            case "today" -> {
                periodFrom = today;
                periodTo   = today;
                prevFrom   = today.minusDays(1);
                prevTo     = today.minusDays(1);
            }
            case "week" -> {
                periodFrom = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                periodTo   = today;
                prevFrom   = periodFrom.minusWeeks(1);
                prevTo     = periodTo.minusWeeks(1);
            }
            case "custom" -> {
                periodFrom = customFrom != null ? customFrom : today.withDayOfMonth(1);
                periodTo   = customTo   != null ? customTo   : today;
                long days  = ChronoUnit.DAYS.between(periodFrom, periodTo) + 1;
                prevFrom   = periodFrom.minusDays(days);
                prevTo     = periodTo.minusDays(days);
            }
            default -> { // month
                periodFrom = today.withDayOfMonth(1);
                periodTo   = today;
                prevFrom   = today.minusMonths(1).withDayOfMonth(1);
                prevTo     = today.minusMonths(1).with(TemporalAdjusters.lastDayOfMonth());
            }
        }

        // ── 2. Load raw data ──────────────────────────────────────────────────
        long totalEmployees = employeeRepository.countActive();

        List<Attendance> todayAttendances = attendanceRepository.findAllByDate(today);
        List<Attendance> prevDayAttendances = attendanceRepository.findAllByDate(today.minusDays(1));
        List<Attendance> periodAttendances = attendanceRepository.findAllForHistory(periodFrom, periodTo);

        LocalDateTime periodFromDt = periodFrom.atStartOfDay();
        LocalDateTime periodToDt   = periodTo.atTime(LocalTime.MAX);
        LocalDateTime prevFromDt   = prevFrom.atStartOfDay();
        LocalDateTime prevToDt     = prevTo.atTime(LocalTime.MAX);

        List<SalaryAdvanceRequest> periodAdvances =
                salaryAdvanceRequestRepository.findAllByCreatedAtBetween(periodFromDt, periodToDt);
        List<SalaryAdvanceRequest> prevAdvances =
                salaryAdvanceRequestRepository.findAllByCreatedAtBetween(prevFromDt, prevToDt);

        // Recent 5 advances (all time)
        List<SalaryAdvanceRequest> allAdvancesDesc =
                salaryAdvanceRequestRepository.findAllDetailedOrderByCreatedAtDesc();

        // ── 3. PRESENCE section ───────────────────────────────────────────────
        long presentToday = todayAttendances.stream()
                .filter(a -> a.getClockIn() != null && a.getAbsenceReason() == null).count();
        long absentToday = todayAttendances.stream()
                .filter(a -> a.getAbsenceReason() != null).count();
        long pendingToday = todayAttendances.stream()
                .filter(a -> a.getClockIn() == null && a.getAbsenceReason() == null).count();

        double rateToday = totalEmployees > 0
                ? Math.round((presentToday * 100.0 / totalEmployees) * 10.0) / 10.0
                : 0.0;

        long prevPresentDay = prevDayAttendances.stream()
                .filter(a -> a.getClockIn() != null && a.getAbsenceReason() == null).count();
        long prevAbsentDay = prevDayAttendances.stream()
                .filter(a -> a.getAbsenceReason() != null).count();

        long deltaPresentVsPrev = presentToday - prevPresentDay;
        long deltaAbsentVsPrev  = absentToday  - prevAbsentDay;

        // chart evolution — group by date
        List<EvolutionPointDto> chartEvolution = buildChartEvolution(periodAttendances, periodFrom, periodTo);

        // chart by dept — count absences grouped by department in period
        List<DeptAbsenceDto> chartByDept = buildChartByDept(periodAttendances);

        PresenceSectionDto presenceSection = PresenceSectionDto.builder()
                .totalEmployees(totalEmployees)
                .presentToday(presentToday)
                .absentToday(absentToday)
                .pendingToday(pendingToday)
                .rateToday(rateToday)
                .deltaPresentVsPrev(deltaPresentVsPrev)
                .deltaAbsentVsPrev(deltaAbsentVsPrev)
                .chartEvolution(chartEvolution)
                .chartByDept(chartByDept)
                .build();

        // ── 4. ADVANCES section ───────────────────────────────────────────────
        long totalRequests = periodAdvances.size();
        long enCoursCount  = periodAdvances.stream().filter(r -> r.getStatus() == SalaryAdvanceRequestStatus.EN_COURS).count();
        long doneCount     = periodAdvances.stream().filter(r -> r.getStatus() == SalaryAdvanceRequestStatus.DONE).count();

        BigDecimal totalAmountDone = periodAdvances.stream()
                .filter(r -> r.getStatus() == SalaryAdvanceRequestStatus.DONE)
                .map(SalaryAdvanceRequest::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        double approvalRate = (doneCount + enCoursCount) > 0
                ? Math.round((doneCount * 100.0 / (doneCount + enCoursCount)) * 10.0) / 10.0
                : 0.0;

        long deltaRequests = totalRequests - prevAdvances.size();

        List<AdvanceStatusPointDto> chartStatus = buildChartStatus(periodAdvances, periodFrom, periodTo);
        List<DeptAvgAmountDto> chartAvgByDept   = buildChartAvgByDept(periodAdvances);

        AdvanceSectionDto advanceSection = AdvanceSectionDto.builder()
                .totalRequests(totalRequests)
                .totalAmountDone(totalAmountDone)
                .enCoursCount(enCoursCount)
                .approvalRate(approvalRate)
                .deltaRequests(deltaRequests)
                .chartStatus(chartStatus)
                .chartAvgByDept(chartAvgByDept)
                .build();

        // ── 5. ALERTS ─────────────────────────────────────────────────────────
        LocalDate sevenDaysAgo = today.minusDays(6);
        List<Attendance> recentAttendances = attendanceRepository.findAllForHistory(sevenDaysAgo, today);

        List<UnjustifiedAbsenceAlertDto> unjustifiedAlerts =
                buildUnjustifiedAlerts(recentAttendances);

        LocalDateTime threshold24h = LocalDateTime.now(TZ).minusHours(24);
        List<PendingAdvanceAlertDto> pendingAlerts = allAdvancesDesc.stream()
                .filter(r -> r.getStatus() == SalaryAdvanceRequestStatus.EN_COURS
                          && r.getCreatedAt() != null
                          && r.getCreatedAt().isBefore(threshold24h))
                .limit(5)
                .map(r -> new PendingAdvanceAlertDto(
                        safeFullName(r),
                        r.getAmount(),
                        (int) ChronoUnit.DAYS.between(r.getCreatedAt().toLocalDate(), today)
                ))
                .collect(Collectors.toList());

        // last import date = max attendance.date for today (if any record exists today → imported today)
        String lastImportDate = null;
        if (!todayAttendances.isEmpty()) {
            lastImportDate = today.format(ISO_DATE);
        } else {
            // find most recent date in period attendances
            periodAttendances.stream()
                    .map(Attendance::getDate)
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .ifPresent(d -> {});
            // query all history to find last date
            List<Attendance> last7 = recentAttendances;
            if (!last7.isEmpty()) {
                LocalDate maxDate = last7.stream().map(Attendance::getDate)
                        .filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
                if (maxDate != null) lastImportDate = maxDate.format(ISO_DATE);
            }
        }

        AlertsSectionDto alertsSection = AlertsSectionDto.builder()
                .unjustifiedAbsences(unjustifiedAlerts)
                .pendingAdvances(pendingAlerts)
                .lastImportDate(lastImportDate)
                .build();

        // ── 6. RECENT DATA ────────────────────────────────────────────────────
        List<RecentAdvanceDto> recentAdvances = allAdvancesDesc.stream()
                .limit(5)
                .map(r -> new RecentAdvanceDto(
                        safeFullName(r),
                        r.getAmount(),
                        r.getCreatedAt() != null ? r.getCreatedAt().toLocalDate().format(ISO_DATE) : "",
                        r.getStatus().name()
                ))
                .collect(Collectors.toList());

        // Recent absences — from history (period), sorted desc by date, take 5 with absenceReason
        List<RecentAbsenceDto> recentAbsences = recentAttendances.stream()
                .filter(a -> a.getAbsenceReason() != null)
                .sorted(Comparator.comparing(Attendance::getDate, Comparator.reverseOrder()))
                .limit(5)
                .map(a -> new RecentAbsenceDto(
                        a.getEmployee() != null ? a.getEmployee().getFullName() : "",
                        a.getEmployee() != null && a.getEmployee().getDepartment() != null
                                ? a.getEmployee().getDepartment().getName() : "",
                        a.getDate() != null ? a.getDate().format(ISO_DATE) : "",
                        a.getAbsenceReason() != null ? a.getAbsenceReason().getReason() : ""
                ))
                .collect(Collectors.toList());

        return AdminDashboardDto.builder()
                .presence(presenceSection)
                .advances(advanceSection)
                .alerts(alertsSection)
                .recentAdvances(recentAdvances)
                .recentAbsences(recentAbsences)
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<EvolutionPointDto> buildChartEvolution(
            List<Attendance> records, LocalDate from, LocalDate to) {

        // Determine granularity: day if ≤ 31 days, else week
        long spanDays = ChronoUnit.DAYS.between(from, to) + 1;
        boolean byDay = spanDays <= 31;

        Map<String, long[]> buckets = new LinkedHashMap<>();

        if (byDay) {
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                buckets.put(d.format(DAY_FMT), new long[]{0, 0, 0});
            }
        } else {
            for (LocalDate d = from; !d.isAfter(to); d = d.plusWeeks(1)) {
                buckets.put(d.format(WEEK_FMT), new long[]{0, 0, 0});
            }
        }

        for (Attendance a : records) {
            if (a.getDate() == null) continue;
            String key = byDay ? a.getDate().format(DAY_FMT) : a.getDate().format(WEEK_FMT);
            long[] arr = buckets.get(key);
            if (arr == null) continue;
            if (a.getAbsenceReason() != null) {
                arr[1]++; // absent
            } else if (a.getClockIn() != null) {
                arr[0]++; // present
            } else {
                arr[2]++; // pending
            }
        }

        return buckets.entrySet().stream()
                .map(e -> new EvolutionPointDto(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2]))
                .collect(Collectors.toList());
    }

    private List<DeptAbsenceDto> buildChartByDept(List<Attendance> records) {
        Map<String, Long> map = records.stream()
                .filter(a -> a.getAbsenceReason() != null && a.getEmployee() != null
                        && a.getEmployee().getDepartment() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getEmployee().getDepartment().getName(),
                        Collectors.counting()
                ));
        return map.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> new DeptAbsenceDto(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    private List<AdvanceStatusPointDto> buildChartStatus(
            List<SalaryAdvanceRequest> requests, LocalDate from, LocalDate to) {

        long spanDays = ChronoUnit.DAYS.between(from, to) + 1;
        boolean byMonth = spanDays > 31;

        Map<String, long[]> buckets = new LinkedHashMap<>();
        if (byMonth) {
            for (LocalDate d = from.withDayOfMonth(1); !d.isAfter(to); d = d.plusMonths(1)) {
                buckets.put(d.format(MONTH_FMT), new long[]{0, 0});
            }
        } else {
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                buckets.put(d.format(DAY_FMT), new long[]{0, 0});
            }
        }

        for (SalaryAdvanceRequest r : requests) {
            if (r.getCreatedAt() == null) continue;
            LocalDate d = r.getCreatedAt().toLocalDate();
            String key = byMonth ? d.format(MONTH_FMT) : d.format(DAY_FMT);
            long[] arr = buckets.get(key);
            if (arr == null) continue;
            if (r.getStatus() == SalaryAdvanceRequestStatus.DONE) arr[0]++;
            else arr[1]++;
        }

        return buckets.entrySet().stream()
                .map(e -> new AdvanceStatusPointDto(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .collect(Collectors.toList());
    }

    private List<DeptAvgAmountDto> buildChartAvgByDept(List<SalaryAdvanceRequest> requests) {
        Map<String, List<BigDecimal>> map = new LinkedHashMap<>();
        for (SalaryAdvanceRequest r : requests) {
            if (r.getStatus() != SalaryAdvanceRequestStatus.DONE) continue;
            if (r.getRequester() == null || r.getRequester().getDepartment() == null) continue;
            String dept = r.getRequester().getDepartment().getName();
            map.computeIfAbsent(dept, k -> new ArrayList<>()).add(r.getAmount());
        }
        return map.entrySet().stream()
                .map(e -> {
                    BigDecimal avg = e.getValue().stream()
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(e.getValue().size()), 2, RoundingMode.HALF_UP);
                    return new DeptAvgAmountDto(e.getKey(), avg);
                })
                .sorted(Comparator.comparing(DeptAvgAmountDto::getAvgAmount).reversed())
                .collect(Collectors.toList());
    }

    private List<UnjustifiedAbsenceAlertDto> buildUnjustifiedAlerts(List<Attendance> records) {
        Map<String, long[]> byEmployee = new LinkedHashMap<>();
        Map<String, String> nameByMatricule = new LinkedHashMap<>();

        for (Attendance a : records) {
            if (a.getAbsenceReason() == null) continue;
            if (a.getEmployee() == null) continue;
            String reason = a.getAbsenceReason().getReason();
            if (reason == null || !reason.toUpperCase().contains("NON JUSTIF")) continue;

            String mat = a.getEmployee().getMatricule();
            nameByMatricule.putIfAbsent(mat, a.getEmployee().getFullName());
            byEmployee.computeIfAbsent(mat, k -> new long[]{0})[0]++;
        }

        return byEmployee.entrySet().stream()
                .sorted(Map.Entry.<String, long[]>comparingByValue(
                        Comparator.comparingLong(arr -> -arr[0])))
                .limit(5)
                .map(e -> new UnjustifiedAbsenceAlertDto(
                        e.getKey(),
                        nameByMatricule.get(e.getKey()),
                        (int) e.getValue()[0]
                ))
                .collect(Collectors.toList());
    }

    private static String safeFullName(SalaryAdvanceRequest r) {
        if (r.getRequester() == null) return "";
        return r.getRequester().getFullName() != null ? r.getRequester().getFullName() : "";
    }

    @Transactional(readOnly = true)
    public List<ProjectHoursRowDTO> computeProjectHours(LocalDate from, LocalDate to) {
        if (from == null || to == null) return List.of();
        if (to.isBefore(from)) return List.of();

        // 0) Best supervisor per project (source = Employee) — utilisé uniquement pour les projets sans permutation
        final Map<Long, BestSupervisorDTO> bestSupByProject = bestSupervisorByProjectFromEmployees();

        // 1) Permutations acceptées overlapping
        List<Permutation> perms = permutationRepository.findAcceptedOverlapping(from, to);

        // 1 ligne par (projet, superviseur) — clé composite "projectId|supervisorId"
        Map<String, ProjectHoursAggDTO> aggByCompositeKey = new HashMap<>();
        Map<Long, String> projectNameById = new HashMap<>();
        Map<Long, BestSupervisorDTO> supervisorById = new HashMap<>();

        for (Permutation p : perms) {
            if (p == null) continue;
            if (p.getStatus() != PermutationStatus.ACCEPTEE) continue;

            ProductionLine destPl = p.getProductionLine();
            if (destPl == null) continue;

            Long destProjectId = destPl.getId();
            projectNameById.putIfAbsent(destProjectId, resolveProjectName(destPl));

            // overlap clamp
            LocalDate start = p.getStartDate();
            LocalDate end = p.getEndDate();
            if (start == null || end == null) continue;

            LocalDate effStart = start.isBefore(from) ? from : start;
            LocalDate effEnd = end.isAfter(to) ? to : end;
            if (effEnd.isBefore(effStart)) continue;

            long days = ChronoUnit.DAYS.between(effStart, effEnd) + 1;
            if (days <= 0) continue;

            LocalTime t1 = p.getStartTime();
            LocalTime t2 = p.getEndTime();
            if (t1 == null || t2 == null) continue;

            long minutes = ChronoUnit.MINUTES.between(t1, t2);
            if (minutes <= 0) continue;

            double hoursPerOperator = (minutes / 60.0) * days;

            var ops = (p.getOperators() == null) ? Set.<tn.sage.rh.employee.Employee>of() : p.getOperators();
            if (ops.isEmpty()) continue;

            // Receiver = superviseur responsable des heures ajoutées au projet destination
            tn.sage.rh.employee.Employee recv = p.getReceiver();
            Long recvId = (recv != null) ? recv.getId() : null;
            if (recv != null) {
                supervisorById.putIfAbsent(recvId, new BestSupervisorDTO(
                        recvId, safe(recv.getFullName()), nullIfBlank(recv.getMatricule()), 0));
            }

            String recvKey = destProjectId + "|" + (recvId != null ? recvId : "null");
            ProjectHoursAggDTO destAgg = aggByCompositeKey.computeIfAbsent(recvKey, k -> new ProjectHoursAggDTO());

            // (A) Heures ajoutées (IN) : projet destination, superviseur = receiver de la permutation
            destAgg.addAjoutees(ops.size() * hoursPerOperator);

            // (B) Heures transférées (OUT) : projet source de chaque opérateur, superviseur = superviseur de l'opérateur
            for (var op : ops) {
                if (op == null) continue;

                ProductionLine sourcePl = op.getProductionLine();
                if (sourcePl == null) continue;

                Long sourceProjectId = sourcePl.getId();

                if (!Objects.equals(sourceProjectId, destProjectId)) {
                    projectNameById.putIfAbsent(sourceProjectId, resolveProjectName(sourcePl));

                    tn.sage.rh.employee.Employee opSup = op.getSupervisor();
                    Long opSupId = (opSup != null) ? opSup.getId() : null;
                    if (opSup != null) {
                        supervisorById.putIfAbsent(opSupId, new BestSupervisorDTO(
                                opSupId, safe(opSup.getFullName()), nullIfBlank(opSup.getMatricule()), 0));
                    }

                    String sourceKey = sourceProjectId + "|" + (opSupId != null ? opSupId : "null");
                    ProjectHoursAggDTO sourceAgg =
                            aggByCompositeKey.computeIfAbsent(sourceKey, k -> new ProjectHoursAggDTO());
                    sourceAgg.addTransferees(hoursPerOperator);
                }
            }
        }

        // 2) Ajouter tous les projets même sans permutations (heures=0 mais superviseur affichable)
        Set<Long> projectsWithData = new HashSet<>();
        for (String key : aggByCompositeKey.keySet()) {
            try { projectsWithData.add(Long.parseLong(key.split("\\|")[0])); } catch (Exception ignored) {}
        }

        List<ProductionLineMinimalDto> allProjectsDTO = productionLineService.findAll();
        for (ProductionLineMinimalDto plDTO : allProjectsDTO) {
            if (plDTO == null) continue;

            Long projectId = plDTO.getId();
            String projectName = plDTO.getName() != null && !plDTO.getName().isBlank()
                    ? plDTO.getName().trim()
                    : "Projet #" + projectId;

            projectNameById.putIfAbsent(projectId, projectName);

            if (!projectsWithData.contains(projectId)) {
                BestSupervisorDTO best = bestSupByProject.get(projectId);
                Long bestSupId = (best != null) ? best.getId() : null;
                String defaultKey = projectId + "|" + (bestSupId != null ? bestSupId : "null");
                aggByCompositeKey.put(defaultKey, new ProjectHoursAggDTO());
                if (best != null) supervisorById.putIfAbsent(bestSupId, best);
            }
        }

        // 3) Build DTOs
        List<ProjectHoursRowDTO> out = new ArrayList<>(aggByCompositeKey.size());

        for (var entry : aggByCompositeKey.entrySet()) {
            String key = entry.getKey();
            ProjectHoursAggDTO a = entry.getValue();

            String[] parts = key.split("\\|", 2);
            Long projectId = Long.parseLong(parts[0]);
            Long supervisorId = (parts.length > 1 && !"null".equals(parts[1]))
                    ? Long.parseLong(parts[1]) : null;

            String projectName = projectNameById.getOrDefault(projectId, "Projet #" + projectId);
            BestSupervisorDTO sup = supervisorId != null ? supervisorById.get(supervisorId) : null;

            out.add(ProjectHoursRowDTO.builder()
                    .idProjet(projectId)
                    .nomProjet(projectName)
                    .idSuperviseur(supervisorId)
                    .nomSuperviseur(sup != null ? safe(sup.getFullName()) : "")
                    .matriculeSuperviseur(sup != null ? sup.getMatricule() : null)
                    .heuresAjoutees(round2(a.getHeuresAjoutees()))
                    .heuresTransferees(round2(a.getHeuresTransferees()))
                    .build());
        }

        out.sort(Comparator
                .comparing(r -> safe(r.getNomProjet()), String.CASE_INSENSITIVE_ORDER));
        return out;
    }

    // ======================================================
    // Best supervisor per project (Employee -> ProductionLine + Supervisor)
    // ======================================================
    private Map<Long, BestSupervisorDTO> bestSupervisorByProjectFromEmployees() {
        Map<Long, BestSupervisorDTO> map = new HashMap<>();

        List<ProjectBestSupervisorRow> rows = employeeRepository.findSupervisorCountsByProject();
        for (ProjectBestSupervisorRow r : rows) {
            if (r == null) continue;

            Long projectId = r.getProjectId();
            if (projectId == null) continue;

            Long supId = r.getSupervisorId();
            long cnt = (r.getOperatorsCount() == null) ? 0 : r.getOperatorsCount();

            BestSupervisorDTO current = map.get(projectId);

            boolean replace = false;
            if (current == null) {
                replace = true;
            } else if (cnt > current.getOperatorsCount()) {
                replace = true;
            } else if (cnt == current.getOperatorsCount()) {
                // tie-breaker stable: plus petit supervisorId (nulls last)
                Long curId = current.getId();
                if (curId == null && supId != null) replace = true;
                else if (curId != null && supId != null && supId < curId) replace = true;
            }

            if (replace) {
                map.put(projectId, new BestSupervisorDTO(
                        supId,
                        safe(r.getSupervisorFullName()),
                        nullIfBlank(r.getSupervisorMatricule()),
                        cnt
                ));
            }
        }
        return map;
    }

    private static String resolveProjectName(ProductionLine pl) {
        if (pl == null) return "";
        String name = pl.getName();
        if (name != null && !name.isBlank()) return name.trim();
        return "Projet #" + pl.getId();
    }

    private static String safe(String s) {
        return (s == null) ? "" : s;
    }

    private static String nullIfBlank(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
    @Transactional(readOnly = true)
    public List<PermutationsDailyDTO> getPermutationsDaily(LocalDate from, LocalDate to) {
        if (from == null || to == null) return List.of();
        if (to.isBefore(from)) return List.of();

        List<PermutationsDailyDTO> out = new ArrayList<>();

        LocalDate day = from;
        while (!day.isAfter(to)) {
            long cnt = permutationRepository.countAcceptedOverlappingDay(day);
            out.add(new PermutationsDailyDTO(day, cnt));
            day = day.plusDays(1);
        }

        return out;
    }
}