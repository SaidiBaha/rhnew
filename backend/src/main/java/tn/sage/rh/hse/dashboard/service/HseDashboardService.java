package tn.sage.rh.hse.dashboard.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.hse.dashboard.dto.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HseDashboardService {

    @PersistenceContext
    private EntityManager em;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /* ─────────────────────────── KPIs ──────────────────────────────────────── */

    public HseKpiDto getKpis(LocalDate dateFrom, LocalDate dateTo, String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
              COUNT(*) AS total,
              SUM(CASE WHEN status = 'TERMINE' THEN 1 ELSE 0 END)      AS termine,
              SUM(CASE WHEN status = 'EN_COURS' THEN 1 ELSE 0 END)     AS enCours,
              SUM(CASE WHEN status = 'EN_RETARD' THEN 1 ELSE 0 END)    AS enRetard,
              SUM(CASE WHEN status = 'ANNULE' THEN 1 ELSE 0 END)       AS annule,
              SUM(CASE WHEN completed_late = true THEN 1 ELSE 0 END)   AS completedLate
            FROM audits a
            WHERE 1=1
            """);
        appendFilters(sql, dateFrom, dateTo, lineZone, auditorId);

        Query q = em.createNativeQuery(sql.toString());
        bindFilters(q, dateFrom, dateTo, lineZone, auditorId);

        Object[] row = (Object[]) q.getSingleResult();
        long total     = toLong(row[0]);
        long termine   = toLong(row[1]);
        long enCours   = toLong(row[2]);
        long enRetard  = toLong(row[3]);
        long annule    = toLong(row[4]);
        long lateDone  = toLong(row[5]);
        double taux    = total == 0 ? 0 : Math.round(100.0 * termine / total * 10.0) / 10.0;

        Double scoreMoyen = getGlobalScore(dateFrom, dateTo, lineZone, auditorId);

        return HseKpiDto.builder()
                .totalAudits(total)
                .termine(termine)
                .enCours(enCours)
                .enRetard(enRetard)
                .annule(annule)
                .completedLate(lateDone)
                .tauxCompletion(taux)
                .scoreMoyenGlobal(scoreMoyen)
                .build();
    }

    private Double getGlobalScore(LocalDate dateFrom, LocalDate dateTo, String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT AVG(score_pct) FROM (
              SELECT
                100.0 * SUM(CASE WHEN cr.response = 'OK'  THEN 1 ELSE 0 END) /
                NULLIF(SUM(CASE WHEN cr.response IN ('OK','NOK') THEN 1 ELSE 0 END), 0) AS score_pct
              FROM audits a
              JOIN checklist_instances ci ON a.instance_id = ci.id
              JOIN checklist_responses cr ON cr.instance_id = ci.id
              WHERE a.status = 'TERMINE'
            """);
        appendFilters(sql, dateFrom, dateTo, lineZone, auditorId);
        sql.append("  GROUP BY a.id\n) scores");

        Query q = em.createNativeQuery(sql.toString());
        bindFilters(q, dateFrom, dateTo, lineZone, auditorId);

        Object result = q.getSingleResult();
        if (result == null) return null;
        double raw = ((Number) result).doubleValue();
        return Math.round(raw * 10.0) / 10.0;
    }

    /* ────────────────────── Répartition des statuts ────────────────────────── */

    public List<HseStatusDistributionItem> getByStatus(LocalDate dateFrom, LocalDate dateTo,
                                                       String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT a.status, COUNT(*) AS cnt
            FROM audits a
            WHERE 1=1
            """);
        appendFilters(sql, dateFrom, dateTo, lineZone, auditorId);
        sql.append(" GROUP BY a.status ORDER BY cnt DESC");

        Query q = em.createNativeQuery(sql.toString());
        bindFilters(q, dateFrom, dateTo, lineZone, auditorId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        long total = rows.stream().mapToLong(r -> toLong(r[1])).sum();

        return rows.stream().map(r -> HseStatusDistributionItem.builder()
                .status((String) r[0])
                .count(toLong(r[1]))
                .percentage(total == 0 ? 0 : Math.round(1000.0 * toLong(r[1]) / total) / 10.0)
                .build()).toList();
    }

    /* ─────────────────────── Audits par ligne ──────────────────────────────── */

    public List<HseByLineItem> getByLine(LocalDate dateFrom, LocalDate dateTo,
                                         String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
              COALESCE(a.line_zone, 'Non définie') AS line_zone,
              COUNT(*) AS total,
              SUM(CASE WHEN a.status = 'EN_ATTENTE' THEN 1 ELSE 0 END) AS en_attente,
              SUM(CASE WHEN a.status = 'EN_COURS'   THEN 1 ELSE 0 END) AS en_cours,
              SUM(CASE WHEN a.status = 'TERMINE'    THEN 1 ELSE 0 END) AS termine,
              SUM(CASE WHEN a.status = 'EN_RETARD'  THEN 1 ELSE 0 END) AS en_retard,
              SUM(CASE WHEN a.status = 'ANNULE'     THEN 1 ELSE 0 END) AS annule
            FROM audits a
            WHERE 1=1
            """);
        appendFilters(sql, dateFrom, dateTo, lineZone, auditorId);
        sql.append(" GROUP BY COALESCE(a.line_zone, 'Non définie') ORDER BY total DESC");

        Query q = em.createNativeQuery(sql.toString());
        bindFilters(q, dateFrom, dateTo, lineZone, auditorId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        return rows.stream().map(r -> HseByLineItem.builder()
                .lineZone((String) r[0])
                .total(toLong(r[1]))
                .enAttente(toLong(r[2]))
                .enCours(toLong(r[3]))
                .termine(toLong(r[4]))
                .enRetard(toLong(r[5]))
                .annule(toLong(r[6]))
                .build()).toList();
    }

    /* ─────────────────────── Scores par ligne ──────────────────────────────── */

    public List<HseScoreByLineItem> getScoresByLine(LocalDate dateFrom, LocalDate dateTo,
                                                     String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
              COALESCE(sub.line_zone, 'Non définie') AS line_zone,
              AVG(sub.score_pct)                     AS score_moyen,
              COUNT(*)                               AS nb_checklists
            FROM (
              SELECT
                a.line_zone,
                100.0 * SUM(CASE WHEN cr.response = 'OK'  THEN 1 ELSE 0 END) /
                NULLIF(SUM(CASE WHEN cr.response IN ('OK','NOK') THEN 1 ELSE 0 END), 0) AS score_pct
              FROM audits a
              JOIN checklist_instances ci ON a.instance_id = ci.id
              JOIN checklist_responses cr ON cr.instance_id = ci.id
              WHERE a.status = 'TERMINE'
            """);
        appendFilters(sql, dateFrom, dateTo, lineZone, auditorId);
        sql.append("""
              GROUP BY a.id, a.line_zone
            ) sub
            GROUP BY sub.line_zone
            ORDER BY score_moyen ASC
            """);

        Query q = em.createNativeQuery(sql.toString());
        bindFilters(q, dateFrom, dateTo, lineZone, auditorId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        return rows.stream().map(r -> HseScoreByLineItem.builder()
                .lineZone((String) r[0])
                .scoreMoyen(r[1] == null ? 0.0 : Math.round(((Number) r[1]).doubleValue() * 10.0) / 10.0)
                .nbChecklists(toLong(r[2]))
                .build()).toList();
    }

    /* ────────────────────── Évolution mensuelle ────────────────────────────── */

    public List<HseTimelineItem> getTimeline(LocalDate dateFrom, LocalDate dateTo,
                                              String lineZone, Long auditorId) {
        LocalDate effectiveFrom = dateFrom != null ? dateFrom
                : LocalDate.now().minusMonths(11).withDayOfMonth(1);

        StringBuilder sql = new StringBuilder("""
            SELECT
              TO_CHAR(a.date, 'YYYY-MM')                                   AS month,
              COUNT(*)                                                      AS planifies,
              SUM(CASE WHEN a.status = 'TERMINE' THEN 1 ELSE 0 END)       AS termines
            FROM audits a
            WHERE a.date >= :effectiveFrom
            """);
        if (dateTo != null) sql.append(" AND a.date <= :dateTo");
        if (lineZone != null) sql.append(" AND a.line_zone = :lineZone");
        if (auditorId != null) sql.append(" AND a.assigned_employee_id = :auditorId");
        sql.append(" GROUP BY TO_CHAR(a.date, 'YYYY-MM') ORDER BY month");

        Query q = em.createNativeQuery(sql.toString());
        q.setParameter("effectiveFrom", effectiveFrom);
        if (dateTo != null) q.setParameter("dateTo", dateTo);
        if (lineZone != null) q.setParameter("lineZone", lineZone);
        if (auditorId != null) q.setParameter("auditorId", auditorId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        return rows.stream().map(r -> HseTimelineItem.builder()
                .month((String) r[0])
                .planifies(toLong(r[1]))
                .termines(toLong(r[2]))
                .build()).toList();
    }

    /* ─────────────────────── Top 5 points N'OK ────────────────────────────── */

    public List<HseNokPointItem> getTopNokPoints(LocalDate dateFrom, LocalDate dateTo,
                                                  String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
              ci_item.id        AS item_id,
              ci_item.label     AS item_label,
              cc.name           AS category_name,
              COUNT(*)          AS nok_count
            FROM checklist_responses cr
            JOIN checklist_instances ci ON cr.instance_id = ci.id
            JOIN audits a ON a.instance_id = ci.id
            JOIN checklist_items ci_item ON cr.item_id = ci_item.id
            JOIN checklist_categories cc ON ci_item.category_id = cc.id
            WHERE cr.response = 'NOK'
            """);
        appendFilters(sql, dateFrom, dateTo, lineZone, auditorId);
        sql.append(" GROUP BY ci_item.id, ci_item.label, cc.name ORDER BY nok_count DESC LIMIT 5");

        Query q = em.createNativeQuery(sql.toString());
        bindFilters(q, dateFrom, dateTo, lineZone, auditorId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        return rows.stream().map(r -> HseNokPointItem.builder()
                .itemId(toLong(r[0]))
                .itemLabel((String) r[1])
                .categoryName((String) r[2])
                .nokCount(toLong(r[3]))
                .build()).toList();
    }

    /* ────────────────────── Top 5 catégories N'OK ──────────────────────────── */

    public List<HseNokCategoryItem> getTopNokCategories(LocalDate dateFrom, LocalDate dateTo,
                                                         String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
              cc.name      AS category_name,
              COUNT(*)     AS nok_count
            FROM checklist_responses cr
            JOIN checklist_instances ci ON cr.instance_id = ci.id
            JOIN audits a ON a.instance_id = ci.id
            JOIN checklist_items ci_item ON cr.item_id = ci_item.id
            JOIN checklist_categories cc ON ci_item.category_id = cc.id
            WHERE cr.response = 'NOK'
            """);
        appendFilters(sql, dateFrom, dateTo, lineZone, auditorId);
        sql.append(" GROUP BY cc.name ORDER BY nok_count DESC LIMIT 5");

        Query q = em.createNativeQuery(sql.toString());
        bindFilters(q, dateFrom, dateTo, lineZone, auditorId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        return rows.stream().map(r -> HseNokCategoryItem.builder()
                .categoryName((String) r[0])
                .nokCount(toLong(r[1]))
                .build()).toList();
    }

    /* ─────────────────────── Performance auditeurs ────────────────────────── */

    public List<HseAuditorPerformanceItem> getByAuditor(LocalDate dateFrom, LocalDate dateTo,
                                                         String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
              e.id                                                          AS employee_id,
              e.full_name                                                   AS full_name,
              e.matricule                                                   AS matricule,
              COUNT(*)                                                      AS nb_assigned,
              SUM(CASE WHEN a.status = 'TERMINE'   THEN 1 ELSE 0 END)     AS nb_termine,
              SUM(CASE WHEN a.status = 'EN_RETARD' THEN 1 ELSE 0 END)     AS nb_en_retard
            FROM audits a
            JOIN employee e ON a.assigned_employee_id = e.id
            WHERE 1=1
            """);
        appendFilters(sql, dateFrom, dateTo, lineZone, auditorId);
        sql.append(" GROUP BY e.id, e.full_name, e.matricule ORDER BY nb_assigned DESC");

        Query q = em.createNativeQuery(sql.toString());
        bindFilters(q, dateFrom, dateTo, lineZone, auditorId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();

        // fetch scores per auditor
        Map<Long, Double> scores = getScoresByAuditor(dateFrom, dateTo, lineZone);

        return rows.stream().map(r -> {
            long nbAssigned = toLong(r[3]);
            long nbTermine  = toLong(r[4]);
            double taux     = nbAssigned == 0 ? 0 : Math.round(1000.0 * nbTermine / nbAssigned) / 10.0;
            Long empId      = toLong(r[0]);
            return HseAuditorPerformanceItem.builder()
                    .employeeId(empId)
                    .fullName((String) r[1])
                    .matricule((String) r[2])
                    .nbAssigned(nbAssigned)
                    .nbTermine(nbTermine)
                    .nbEnRetard(toLong(r[5]))
                    .scoreMoyen(scores.getOrDefault(empId, null))
                    .tauxCompletion(taux)
                    .build();
        }).toList();
    }

    private Map<Long, Double> getScoresByAuditor(LocalDate dateFrom, LocalDate dateTo, String lineZone) {
        StringBuilder sql = new StringBuilder("""
            SELECT a.assigned_employee_id AS emp_id, AVG(score_pct) AS score_moyen FROM (
              SELECT
                a.assigned_employee_id,
                100.0 * SUM(CASE WHEN cr.response = 'OK' THEN 1 ELSE 0 END) /
                NULLIF(SUM(CASE WHEN cr.response IN ('OK','NOK') THEN 1 ELSE 0 END), 0) AS score_pct
              FROM audits a
              JOIN checklist_instances ci ON a.instance_id = ci.id
              JOIN checklist_responses cr ON cr.instance_id = ci.id
              WHERE a.status = 'TERMINE'
                AND a.assigned_employee_id IS NOT NULL
            """);
        if (dateFrom != null) sql.append(" AND a.date >= :dateFrom");
        if (dateTo   != null) sql.append(" AND a.date <= :dateTo");
        if (lineZone != null) sql.append(" AND a.line_zone = :lineZone");
        sql.append("""
              GROUP BY a.id, a.assigned_employee_id
            ) sub
            GROUP BY sub.assigned_employee_id
            """);

        Query q = em.createNativeQuery(sql.toString());
        if (dateFrom != null) q.setParameter("dateFrom", dateFrom);
        if (dateTo   != null) q.setParameter("dateTo",   dateTo);
        if (lineZone != null) q.setParameter("lineZone", lineZone);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        Map<Long, Double> map = new HashMap<>();
        for (Object[] r : rows) {
            if (r[1] != null) {
                map.put(toLong(r[0]), Math.round(((Number) r[1]).doubleValue() * 10.0) / 10.0);
            }
        }
        return map;
    }

    /* ────────────────────── Distribution niveaux ───────────────────────────── */

    public Map<String, Long> getConformityLevels(LocalDate dateFrom, LocalDate dateTo,
                                                  String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT score_pct FROM (
              SELECT
                100.0 * SUM(CASE WHEN cr.response = 'OK' THEN 1 ELSE 0 END) /
                NULLIF(SUM(CASE WHEN cr.response IN ('OK','NOK') THEN 1 ELSE 0 END), 0) AS score_pct
              FROM audits a
              JOIN checklist_instances ci ON a.instance_id = ci.id
              JOIN checklist_responses cr ON cr.instance_id = ci.id
              WHERE a.status = 'TERMINE'
            """);
        appendFilters(sql, dateFrom, dateTo, lineZone, auditorId);
        sql.append(" GROUP BY a.id) scores WHERE score_pct IS NOT NULL");

        Query q = em.createNativeQuery(sql.toString());
        bindFilters(q, dateFrom, dateTo, lineZone, auditorId);

        @SuppressWarnings("unchecked")
        List<Object> rows = q.getResultList();
        long n0 = 0, n1 = 0, n23 = 0;
        for (Object o : rows) {
            double s = ((Number) o).doubleValue();
            if      (s >= 96) n0++;
            else if (s >= 60) n1++;
            else              n23++;
        }
        Map<String, Long> result = new LinkedHashMap<>();
        result.put("Niveau 0 (≥96%)", n0);
        result.put("Niveau 1 (60-95%)", n1);
        result.put("Niveau 2/3 (<60%)", n23);
        return result;
    }

    /* ────────────────── Rapport non-conformités ────────────────────────────── */

    public List<HseNonConformityReportItem> getNonConformityReport(LocalDate dateFrom,
            LocalDate dateTo, String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
              a.date                                    AS date_audit,
              COALESCE(a.line_zone, '')                 AS line_zone,
              COALESCE(e.full_name, '')                 AS auditor_name,
              ci_item.order_index                       AS numero,
              cc.name                                   AS category_name,
              ci_item.label                             AS item_label,
              COALESCE(cr.ecart_description, '')        AS ecart_description,
              EXISTS(SELECT 1 FROM checklist_response_photos p WHERE p.response_id = cr.id) AS has_photos
            FROM checklist_responses cr
            JOIN checklist_instances ci ON cr.instance_id = ci.id
            JOIN audits a ON a.instance_id = ci.id
            LEFT JOIN employee e ON a.assigned_employee_id = e.id
            JOIN checklist_items ci_item ON cr.item_id = ci_item.id
            JOIN checklist_categories cc ON ci_item.category_id = cc.id
            WHERE cr.response = 'NOK' AND a.status = 'TERMINE'
            """);
        appendFilters(sql, dateFrom, dateTo, lineZone, auditorId);
        sql.append(" ORDER BY a.date DESC, cc.order_index, ci_item.order_index");

        Query q = em.createNativeQuery(sql.toString());
        bindFilters(q, dateFrom, dateTo, lineZone, auditorId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        return rows.stream().map(r -> HseNonConformityReportItem.builder()
                .dateAudit(r[0] != null ? DATE_FMT.format(((java.sql.Date) r[0]).toLocalDate()) : "")
                .lineZone((String) r[1])
                .auditor((String) r[2])
                .numero(r[3] != null ? ((Number) r[3]).intValue() + 1 : 0)
                .categoryName((String) r[4])
                .itemLabel((String) r[5])
                .ecartDescription((String) r[6])
                .hasPhotos((Boolean) r[7])
                .build()).toList();
    }

    /* ───────────────────── Rapport synthèse par ligne ─────────────────────── */

    public List<HseLineSummaryReportItem> getLineSummaryReport(LocalDate dateFrom,
            LocalDate dateTo, String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
              COALESCE(sub.line_zone, 'Non définie')   AS line_zone,
              COUNT(*)                                  AS nb_audits,
              AVG(sub.score_pct)                        AS score_moyen,
              SUM(sub.nok_count)                        AS nb_nok
            FROM (
              SELECT
                a.line_zone,
                100.0 * SUM(CASE WHEN cr.response = 'OK'  THEN 1 ELSE 0 END) /
                NULLIF(SUM(CASE WHEN cr.response IN ('OK','NOK') THEN 1 ELSE 0 END), 0) AS score_pct,
                SUM(CASE WHEN cr.response = 'NOK' THEN 1 ELSE 0 END)                    AS nok_count
              FROM audits a
              LEFT JOIN checklist_instances ci ON a.instance_id = ci.id
              LEFT JOIN checklist_responses cr ON cr.instance_id = ci.id
              WHERE a.status = 'TERMINE'
            """);
        appendFilters(sql, dateFrom, dateTo, lineZone, auditorId);
        sql.append("""
              GROUP BY a.id, a.line_zone
            ) sub
            GROUP BY sub.line_zone
            ORDER BY sub.line_zone
            """);

        Query q = em.createNativeQuery(sql.toString());
        bindFilters(q, dateFrom, dateTo, lineZone, auditorId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        return rows.stream().map(r -> {
            Double score = r[2] != null ? Math.round(((Number) r[2]).doubleValue() * 10.0) / 10.0 : null;
            String niveau = score == null ? "N/A" : score >= 96 ? "Niveau 0" : score >= 60 ? "Niveau 1" : "Niveau 2/3";
            return HseLineSummaryReportItem.builder()
                    .lineZone((String) r[0])
                    .nbAudits(toLong(r[1]))
                    .scoreMoyen(score)
                    .nbNok(toLong(r[3]))
                    .niveauDominant(niveau)
                    .build();
        }).toList();
    }

    /* ────────────────── Rapport audits en retard ───────────────────────────── */

    public List<HseLateAuditReportItem> getLateAuditsReport(LocalDate dateFrom,
            LocalDate dateTo, String lineZone, Long auditorId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
              a.id                                                                   AS audit_id,
              a.date                                                                 AS date_prevue,
              COALESCE(a.line_zone, '')                                              AS line_zone,
              COALESCE(e.full_name, '')                                              AS auditor_name,
              CASE
                WHEN a.status = 'EN_RETARD'   THEN (CURRENT_DATE - a.date)
                WHEN a.completed_late = true  THEN (DATE(a.completed_at) - a.date)
                ELSE 0
              END                                                                    AS nb_jours_retard,
              a.completed_late
            FROM audits a
            LEFT JOIN employee e ON a.assigned_employee_id = e.id
            WHERE (a.status = 'EN_RETARD' OR a.completed_late = true)
            """);
        if (dateFrom != null) sql.append(" AND a.date >= :dateFrom");
        if (dateTo   != null) sql.append(" AND a.date <= :dateTo");
        if (lineZone != null) sql.append(" AND a.line_zone = :lineZone");
        if (auditorId != null) sql.append(" AND a.assigned_employee_id = :auditorId");
        sql.append(" ORDER BY a.date");

        Query q = em.createNativeQuery(sql.toString());
        if (dateFrom != null) q.setParameter("dateFrom", dateFrom);
        if (dateTo   != null) q.setParameter("dateTo",   dateTo);
        if (lineZone != null) q.setParameter("lineZone", lineZone);
        if (auditorId != null) q.setParameter("auditorId", auditorId);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        return rows.stream().map(r -> HseLateAuditReportItem.builder()
                .auditId(toLong(r[0]))
                .datePrevue(r[1] != null ? DATE_FMT.format(((java.sql.Date) r[1]).toLocalDate()) : "")
                .lineZone((String) r[2])
                .auditorName((String) r[3])
                .nbJoursRetard(r[4] != null ? toLong(r[4]) : 0L)
                .completedLate((Boolean) r[5])
                .build()).toList();
    }

    /* ─────────────────────── Helpers ──────────────────────────────────────── */

    private void appendFilters(StringBuilder sql, LocalDate dateFrom, LocalDate dateTo,
                                String lineZone, Long auditorId) {
        if (dateFrom  != null) sql.append(" AND a.date >= :dateFrom");
        if (dateTo    != null) sql.append(" AND a.date <= :dateTo");
        if (lineZone  != null) sql.append(" AND a.line_zone = :lineZone");
        if (auditorId != null) sql.append(" AND a.assigned_employee_id = :auditorId");
    }

    private void bindFilters(Query q, LocalDate dateFrom, LocalDate dateTo,
                              String lineZone, Long auditorId) {
        if (dateFrom  != null) q.setParameter("dateFrom",  dateFrom);
        if (dateTo    != null) q.setParameter("dateTo",    dateTo);
        if (lineZone  != null) q.setParameter("lineZone",  lineZone);
        if (auditorId != null) q.setParameter("auditorId", auditorId);
    }

    private long toLong(Object o) {
        if (o == null) return 0L;
        return ((Number) o).longValue();
    }
}
