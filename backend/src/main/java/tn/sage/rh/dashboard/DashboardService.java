// tn/sage/rh/dashboard/DashboardService.java
package tn.sage.rh.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.dashboard.dto.BestSupervisorDTO;
import tn.sage.rh.dashboard.dto.PermutationsDailyDTO;
import tn.sage.rh.dashboard.dto.ProjectHoursAggDTO;
import tn.sage.rh.dashboard.dto.ProjectHoursRowDTO;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.organization.dto.ProductionLineMinimalDto;
import tn.sage.rh.organization.entity.ProductionLine;
import tn.sage.rh.organization.repository.ProductionLineRepository;
import tn.sage.rh.organization.service.ProductionLineService;
import tn.sage.rh.permutations.entity.Permutation;
import tn.sage.rh.permutations.entity.PermutationStatus;
import tn.sage.rh.permutations.repository.PermutationRepository;
import tn.sage.rh.employee.projection.ProjectBestSupervisorRow;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final PermutationRepository permutationRepository;
    private final EmployeeRepository employeeRepository;
    private final ProductionLineRepository productionLineRepository; // Gardé car utilisé dans resolveProjectName() pour les entités
    private final ProductionLineService productionLineService;

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