// tn/sage/rh/dashboard/DashboardService.java
package tn.sage.rh.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.dashboard.dto.ProjectHoursRowDTO;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.employee.projection.ProjectBestSupervisorRow;
import tn.sage.rh.organization.entity.ProductionLine;
import tn.sage.rh.organization.repository.ProductionLineRepository;
import tn.sage.rh.permutations.entity.Permutation;
import tn.sage.rh.permutations.entity.PermutationStatus;
import tn.sage.rh.permutations.repository.PermutationRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PermutationRepository permutationRepository;

    // ✅ NEW (méthode 1) : superviseur calculé depuis Employee (prodLine + supervisor)
    private final EmployeeRepository employeeRepository;

    // ✅ Recommandé : pour afficher aussi les projets sans permutation (heures=0)
    private final ProductionLineRepository productionLineRepository;

    /**
     * Agrégation par projet :
     * - Heures ajoutées / transférées (via permutations ACCEPTÉES)
     * - Superviseur affiché = superviseur ayant le PLUS d'opérateurs (distincts) dont productionLine = ce projet
     *   ✅ calculé depuis EmployeeRepository (pas dépendant des permutations)
     */
    private static class Agg {
        double ajoutees = 0.0;
        double transferees = 0.0;

        void addAjoutees(double h) { ajoutees += h; }
        void addTransferees(double h) { transferees += h; }
    }

    private static class BestSup {
        final Long id;
        final String nom;
        final String matricule;
        final long count;

        BestSup(Long id, String nom, String matricule, long count) {
            this.id = id;
            this.nom = nom;
            this.matricule = matricule;
            this.count = count;
        }
    }

    @Transactional(readOnly = true)
    public List<ProjectHoursRowDTO> computeProjectHours(LocalDate from, LocalDate to) {
        if (from == null || to == null) return List.of();
        if (to.isBefore(from)) return List.of();

        // ✅ 0) best supervisor per project (source = Employee)
        final Map<Long, BestSup> bestSupByProject = bestSupervisorByProjectFromEmployees();

        // ✅ 1) permutations ACCEPTÉES qui overlap la période (repo fait déjà le status)
        List<Permutation> perms = permutationRepository.findAcceptedOverlapping(from, to);

        // ✅ 1 ligne par projet
        Map<Long, Agg> aggByProject = new HashMap<>();
        Map<Long, String> projectNameById = new HashMap<>();

        for (Permutation p : perms) {
            if (p == null) continue;
            if (p.getStatus() != PermutationStatus.ACCEPTEE) continue;

            // destination project
            ProductionLine destPl = p.getProductionLine();
            if (destPl == null) continue;

            Long destProjectId = destPl.getId();
            projectNameById.putIfAbsent(destProjectId, resolveProjectName(destPl));

            // dates overlap clamp
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

            Agg destAgg = aggByProject.computeIfAbsent(destProjectId, k -> new Agg());

            // =========================
            // (A) Heures ajoutées (IN) : projet destination
            // =========================
            destAgg.addAjoutees(ops.size() * hoursPerOperator);

            // =========================
            // (B) Heures transférées (OUT) : projet source de chaque opérateur
            // =========================
            for (var op : ops) {
                if (op == null) continue;

                ProductionLine sourcePl = op.getProductionLine();
                if (sourcePl == null) continue;

                Long sourceProjectId = sourcePl.getId();

                if (!Objects.equals(sourceProjectId, destProjectId)) {
                    projectNameById.putIfAbsent(sourceProjectId, resolveProjectName(sourcePl));
                    Agg sourceAgg = aggByProject.computeIfAbsent(sourceProjectId, k -> new Agg());
                    sourceAgg.addTransferees(hoursPerOperator);
                } else {
                    // même projet => pas de "transfert"
                }
            }
        }

        // ✅ 2) (Recommandé) Ajouter tous les projets même sans permutations
        //     => permet d'afficher superviseur + heures=0
        List<ProductionLine> allProjects = productionLineRepository.findAll();
        for (ProductionLine pl : allProjects) {
            if (pl == null) continue;
            projectNameById.putIfAbsent(pl.getId(), resolveProjectName(pl));
            aggByProject.putIfAbsent(pl.getId(), new Agg());
        }

        // ✅ 3) Build DTOs
        List<ProjectHoursRowDTO> out = new ArrayList<>();

        for (var entry : aggByProject.entrySet()) {
            Long projectId = entry.getKey();
            Agg a = entry.getValue();

            String projectName = projectNameById.getOrDefault(projectId, "Projet #" + projectId);

            // ✅ Superviseur depuis Employee (max opérateurs sur ce projet)
            BestSup best = bestSupByProject.get(projectId);

            out.add(ProjectHoursRowDTO.builder()
                    .idProjet(projectId)
                    .nomProjet(projectName)

                    .idSuperviseur(best != null ? best.id : null)
                    .nomSuperviseur(best != null ? safe(best.nom) : "")
                    .matriculeSuperviseur(best != null ? safe(best.matricule) : null)

                    .heuresAjoutees(round2(a.ajoutees))
                    .heuresTransferees(round2(a.transferees))
                    .build());
        }

        out.sort(Comparator.comparing(
                (ProjectHoursRowDTO r) -> safe(r.getNomProjet()),
                String.CASE_INSENSITIVE_ORDER
        ));

        return out;
    }

    // ======================================================
    // ✅ Best supervisor per project (Employee -> ProductionLine + Supervisor)
    // ======================================================
    private Map<Long, BestSup> bestSupervisorByProjectFromEmployees() {
        Map<Long, BestSup> map = new HashMap<>();

        List<ProjectBestSupervisorRow> rows = employeeRepository.findSupervisorCountsByProject();
        for (ProjectBestSupervisorRow r : rows) {
            if (r == null) continue;

            Long projectId = r.getProjectId();
            if (projectId == null) continue;

            Long supId = r.getSupervisorId();
            long cnt = (r.getOperatorsCount() == null) ? 0 : r.getOperatorsCount();

            BestSup current = map.get(projectId);
            if (current == null || cnt > current.count) {
                map.put(projectId, new BestSup(
                        supId,
                        safe(r.getSupervisorFullName()),
                        safe(r.getSupervisorMatricule()),
                        cnt
                ));
            } else if (cnt == current.count) {
                // tie-breaker stable: plus petit supervisorId
                if (supId != null && current.id != null && supId < current.id) {
                    map.put(projectId, new BestSup(
                            supId,
                            safe(r.getSupervisorFullName()),
                            safe(r.getSupervisorMatricule()),
                            cnt
                    ));
                }
            }
        }

        return map;
    }

    // ======================================================
    // Helpers
    // ======================================================
    private static String resolveProjectName(ProductionLine pl) {
        String name = pl.getName();
        if (name != null && !name.isBlank()) return name.trim();
        return "Projet #" + pl.getId();
    }

    private static String safe(String s) {
        return (s == null) ? "" : s;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}