package tn.sage.rh.hse.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.auth.EmailService;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.employee.dto.SupervisorDto;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.hse.audit.dto.AuditActivityLogDto;
import tn.sage.rh.hse.audit.dto.AuditDto;
import tn.sage.rh.hse.audit.dto.AuditStatsDto;
import tn.sage.rh.hse.audit.dto.CreateAuditRequest;
import tn.sage.rh.hse.audit.entity.Audit;
import tn.sage.rh.hse.audit.entity.AuditActivityLog;
import tn.sage.rh.hse.audit.repository.AuditActivityLogRepository;
import tn.sage.rh.hse.audit.repository.AuditRepository;
import tn.sage.rh.hse.checklist.entity.ChecklistInstance;
import tn.sage.rh.hse.checklist.entity.ChecklistResponse;
import tn.sage.rh.hse.checklist.entity.ChecklistTemplate;
import tn.sage.rh.hse.checklist.repository.ChecklistInstanceRepository;
import tn.sage.rh.hse.checklist.repository.ChecklistTemplateRepository;
import tn.sage.rh.hse.checklist.service.ChecklistInstanceService;
import tn.sage.rh.notification.service.NotificationService;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditRepository auditRepository;
    private final AuditActivityLogRepository activityLogRepository;
    private final EmployeeRepository employeeRepository;
    private final ChecklistTemplateRepository templateRepository;
    private final ChecklistInstanceRepository instanceRepository;
    private final ChecklistInstanceService instanceService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /* ── Lecture ── */

    public Page<AuditDto> findAll(int page, int size) {
        return auditRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .map(this::toDto);
    }

    public Page<AuditDto> findWithFilters(Audit.AuditStatus status, String lineZone, Long employeeId,
                                          LocalDate from, LocalDate to, int page, int size) {
        return auditRepository.findWithFilters(status, lineZone, employeeId, from, to, PageRequest.of(page, size))
                .map(this::toDto);
    }

    public AuditDto findById(Long id) {
        return toDto(findAudit(id));
    }

    public List<AuditDto> findMyAudits(Principal principal) {
        User user = resolveUser(principal);
        if (user == null || user.getEmployee() == null) return List.of();
        return auditRepository.findByAssignedEmployeeIdOrderByDateDesc(user.getEmployee().getId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    public AuditStatsDto getStats() {
        long total = auditRepository.count();
        long enAttente = auditRepository.countByStatus(Audit.AuditStatus.EN_ATTENTE);
        long enCours = auditRepository.countByStatus(Audit.AuditStatus.EN_COURS);
        long termine = auditRepository.countByStatus(Audit.AuditStatus.TERMINE);
        long annule = auditRepository.countByStatus(Audit.AuditStatus.ANNULE);
        long enRetard = auditRepository.countByStatus(Audit.AuditStatus.EN_RETARD);
        double taux = total > 0 ? Math.round((double) termine / total * 100 * 10.0) / 10.0 : 0;
        return AuditStatsDto.builder()
                .total(total).enAttente(enAttente).enCours(enCours).termine(termine).annule(annule)
                .enRetard(enRetard).tauxCompletion(taux).build();
    }

    public List<AuditActivityLogDto> getActivityLog(Long auditId) {
        findAudit(auditId);
        return activityLogRepository.findByAuditIdOrderByPerformedAtAsc(auditId)
                .stream()
                .map(this::toActivityDto)
                .toList();
    }

    public List<Employee> findCadreEmployees() {
        return employeeRepository.findAllCadreEmployees();
    }

    /* ── Écriture ── */

    @Transactional
    public AuditDto create(CreateAuditRequest request, Principal principal) {
        User user = resolveUser(principal);
        Audit audit = buildAudit(request, user);
        audit = auditRepository.save(audit);

        logActivity(audit.getId(), "PLANIFIE", user != null ? user.getId() : null,
                "Audit planifié par " + (user != null && user.getEmployee() != null ? user.getEmployee().getFullName() : "système"));

        // Notification à l'auditeur assigné
        if (audit.getAssignedEmployee() != null) {
            notifyAssigneeOnCreation(audit);
        }

        return toDto(audit);
    }

    @Transactional
    public AuditDto update(Long id, CreateAuditRequest request) {
        Audit audit = findAudit(id);

        // Capture old values for change log and EN_RETARD reset
        Employee oldAssignee = audit.getAssignedEmployee();
        LocalDate oldDate = audit.getDate();
        String oldLineZone = audit.getLineZone();
        String oldNotes = audit.getNotes();
        Audit.AuditStatus oldStatus = audit.getStatus();

        applyRequest(audit, request);

        // Reset EN_RETARD → EN_ATTENTE if date moved back to the future
        if (oldStatus == Audit.AuditStatus.EN_RETARD
                && audit.getDate() != null
                && audit.getDate().isAfter(LocalDate.now())) {
            audit.setStatus(Audit.AuditStatus.EN_ATTENTE);
            audit.setRetardNotifSent(false);
        }

        audit = auditRepository.save(audit);

        // Build change detail for log
        StringBuilder changes = new StringBuilder();
        if (oldDate != null && !oldDate.equals(audit.getDate())) {
            changes.append("Date : ").append(oldDate.format(DATE_FMT))
                   .append(" → ").append(audit.getDate() != null ? audit.getDate().format(DATE_FMT) : "—").append("; ");
        }
        if (!java.util.Objects.equals(oldLineZone, audit.getLineZone())) {
            changes.append("Ligne : ").append(oldLineZone != null ? oldLineZone : "—")
                   .append(" → ").append(audit.getLineZone() != null ? audit.getLineZone() : "—").append("; ");
        }
        if (!java.util.Objects.equals(oldNotes, audit.getNotes())) {
            changes.append("Notes modifiées; ");
        }
        String changeDetail = changes.length() > 0
                ? "Audit modifié — " + changes.toString().replaceAll("; $", "")
                : "Audit modifié";
        logActivity(audit.getId(), "MODIFIE", null, changeDetail);

        // Notification : if assignee changed → assignment notification to new assignee
        Employee newAssignee = audit.getAssignedEmployee();
        if (newAssignee != null && (oldAssignee == null || oldAssignee.getId() != newAssignee.getId())) {
            notifyAssigneeOnCreation(audit);
        } else if (newAssignee != null) {
            // Same assignee — notify of modification
            notifyAssigneeOnUpdate(audit);
        }

        return toDto(audit);
    }

    @Transactional
    public AuditDto patchStatus(Long id, Audit.AuditStatus status, Principal principal) {
        Audit audit = findAudit(id);
        Audit.AuditStatus oldStatus = audit.getStatus();
        audit.setStatus(status);

        if (status == Audit.AuditStatus.EN_COURS && oldStatus != Audit.AuditStatus.EN_COURS) {
            audit.setStartedAt(LocalDateTime.now());
        }
        if (status == Audit.AuditStatus.TERMINE && oldStatus != Audit.AuditStatus.TERMINE) {
            audit.setCompletedAt(LocalDateTime.now());
            if (oldStatus == Audit.AuditStatus.EN_RETARD) {
                audit.setCompletedLate(true);
            }
        }

        audit = auditRepository.save(audit);
        User actor = resolveUser(principal);

        if (status == Audit.AuditStatus.EN_COURS) {
            String actorName = actor != null && actor.getEmployee() != null ? actor.getEmployee().getFullName() : "Auditeur";
            logActivity(audit.getId(), "COMMENCE", actor != null ? actor.getId() : null,
                    actorName + " a commencé le remplissage");
            notifyHseOnStatusChange(audit, "EN_COURS", actorName);
        } else if (status == Audit.AuditStatus.TERMINE) {
            String actorName = actor != null && actor.getEmployee() != null ? actor.getEmployee().getFullName() : "Auditeur";
            logActivity(audit.getId(), "TERMINE", actor != null ? actor.getId() : null,
                    actorName + " a validé et enregistré le checklist");
            notifyHseOnStatusChange(audit, "TERMINE", actorName);
        } else if (status == Audit.AuditStatus.ANNULE) {
            logActivity(audit.getId(), "ANNULE", actor != null ? actor.getId() : null, "Audit annulé");
        }

        return toDto(audit);
    }

    @Transactional
    public void delete(Long id) {
        findAudit(id);
        auditRepository.deleteById(id);
    }

    /* ── Notifications ── */

    private void notifyAssigneeOnCreation(Audit audit) {
        Employee assignee = audit.getAssignedEmployee();
        if (assignee.getUser() == null) return;
        Long assigneeUserId = assignee.getUser().getId();
        String dateStr = audit.getDate() != null ? audit.getDate().format(DATE_FMT) : "—";
        String title = "Nouvel audit HSE assigné";
        String msg = "Vous êtes désigné auditeur pour l'audit du " + dateStr
                + " — Ligne : " + (audit.getLineZone() != null ? audit.getLineZone() : "—");

        notificationService.create(assigneeUserId, title, msg, "/my-audits");
        logActivity(audit.getId(), "NOTIF_ENVOYEE", null, "Notification d'affectation envoyée à " + assignee.getFullName());

        if (assignee.getEmail() != null && !assignee.getEmail().isBlank()) {
            String auditTitle = audit.getTemplate() != null ? audit.getTemplate().getTitle() : "Audit HSE";
            String finalEmail = assignee.getEmail();
            String finalName = assignee.getFullName();
            String finalDateStr = dateStr;
            String finalLine = audit.getLineZone() != null ? audit.getLineZone() : "—";
            CompletableFuture.runAsync(() -> {
                try {
                    emailService.sendAuditAssignmentEmail(finalEmail, finalName, auditTitle, finalDateStr, finalLine);
                } catch (Exception e) {
                    log.error("Email affectation audit non envoyé à {} : {}", finalEmail, e.getMessage());
                }
            });
        }
    }

    private void notifyAssigneeOnUpdate(Audit audit) {
        Employee assignee = audit.getAssignedEmployee();
        if (assignee == null || assignee.getUser() == null) return;
        Long assigneeUserId = assignee.getUser().getId();
        String dateStr = audit.getDate() != null ? audit.getDate().format(DATE_FMT) : "—";
        String line = audit.getLineZone() != null ? audit.getLineZone() : "—";
        String title = "Votre audit HSE a été mis à jour";
        String msg = "Votre audit a été mis à jour. Nouvelle date : " + dateStr
                + ". Ligne/Zone : " + line + ". Consultez les détails pour plus d'informations.";

        notificationService.create(assigneeUserId, title, msg, "/my-audits");

        if (assignee.getEmail() != null && !assignee.getEmail().isBlank()) {
            String auditTitle = audit.getTemplate() != null ? audit.getTemplate().getTitle() : "Audit HSE";
            String notes = audit.getNotes();
            String finalEmail = assignee.getEmail();
            String finalName = assignee.getFullName();
            String finalDateStr = dateStr;
            String finalLine = line;
            String finalTitle = auditTitle;
            String finalNotes = notes;
            CompletableFuture.runAsync(() -> {
                try {
                    emailService.sendAuditUpdateEmail(finalEmail, finalName, finalTitle, finalDateStr, finalLine, finalNotes);
                } catch (Exception e) {
                    log.error("Email modification audit non envoyé à {} : {}", finalEmail, e.getMessage());
                }
            });
        }
    }

    private void notifyHseOnStatusChange(Audit audit, String event, String actorName) {
        if (audit.getCreatedBy() == null) return;
        Long hseUserId = audit.getCreatedBy().getId();
        String dateStr = audit.getDate() != null ? audit.getDate().format(DATE_FMT) : "—";
        String auditTitle = audit.getTemplate() != null ? audit.getTemplate().getTitle() : "Audit HSE";

        String title, msg;
        if ("EN_COURS".equals(event)) {
            title = "Remplissage d'audit commencé";
            msg = actorName + " a commencé le remplissage de l'audit " + auditTitle + " — " + dateStr;
        } else {
            title = "Audit terminé et validé";
            msg = actorName + " a validé le checklist de l'audit " + auditTitle + " — " + dateStr;
        }

        notificationService.create(hseUserId, title, msg, "/audits");

        if (audit.getCreatedBy().getEmployee() != null
                && audit.getCreatedBy().getEmployee().getEmail() != null
                && !audit.getCreatedBy().getEmployee().getEmail().isBlank()) {
            String hseEmail = audit.getCreatedBy().getEmployee().getEmail();
            String hseName = audit.getCreatedBy().getEmployee().getFullName();
            String finalMsg = msg;
            CompletableFuture.runAsync(() -> {
                try {
                    emailService.sendAuditStatusChangeEmail(hseEmail, hseName, finalMsg, event);
                } catch (Exception e) {
                    log.error("Email statut audit non envoyé à {} : {}", hseEmail, e.getMessage());
                }
            });
        }
    }

    /* ── Helpers ── */

    private void logActivity(Long auditId, String eventType, Long performedById, String detail) {
        try {
            AuditActivityLog entry = AuditActivityLog.builder()
                    .auditId(auditId)
                    .eventType(eventType)
                    .performedById(performedById)
                    .detail(detail)
                    .build();
            activityLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Erreur log activité audit auditId={} : {}", auditId, e.getMessage());
        }
    }

    private Audit buildAudit(CreateAuditRequest request, User user) {
        Audit audit = Audit.builder()
                .date(request.getDate())
                .lineZone(request.getLineZone())
                .notes(request.getNotes())
                .status(request.getStatus() != null ? request.getStatus() : Audit.AuditStatus.EN_ATTENTE)
                .createdBy(user)
                .build();
        applyRequest(audit, request);
        return audit;
    }

    private void applyRequest(Audit audit, CreateAuditRequest request) {
        audit.setDate(request.getDate());
        audit.setLineZone(request.getLineZone());
        audit.setNotes(request.getNotes());
        if (request.getStatus() != null) audit.setStatus(request.getStatus());

        if (request.getTemplateId() != null) {
            ChecklistTemplate template = templateRepository.findById(request.getTemplateId())
                    .orElseThrow(() -> new InvalidEntityException("Modèle de checklist introuvable"));
            audit.setTemplate(template);
        } else {
            audit.setTemplate(null);
        }

        if (request.getAssignedEmployeeId() != null) {
            Employee employee = employeeRepository.findById(request.getAssignedEmployeeId())
                    .orElseThrow(() -> new InvalidEntityException("Employé introuvable"));
            audit.setAssignedEmployee(employee);
        } else {
            audit.setAssignedEmployee(null);
        }

        if (request.getInstanceId() != null) {
            ChecklistInstance instance = instanceRepository.findById(request.getInstanceId())
                    .orElseThrow(() -> new InvalidEntityException("Instance de checklist introuvable"));
            audit.setInstance(instance);
        } else {
            audit.setInstance(null);
        }
    }

    private Audit findAudit(Long id) {
        return auditRepository.findById(id)
                .orElseThrow(() -> new InvalidEntityException("Audit introuvable"));
    }

    private User resolveUser(Principal principal) {
        if (principal == null) return null;
        return userRepository.findByEmployee_Matricule(principal.getName()).orElse(null);
    }

    public AuditDto toDto(Audit audit) {
        Integer filledCount = null;
        Integer totalCount = null;
        Integer scorePercent = null;
        Integer templateItemCount = null;

        if (audit.getTemplate() != null) {
            templateItemCount = audit.getTemplate().getCategories().stream()
                    .mapToInt(c -> c.getItems() != null ? c.getItems().size() : 0)
                    .sum();
        }

        if (audit.getInstance() != null) {
            List<ChecklistResponse> responses = audit.getInstance().getResponses();
            totalCount = responses.size();
            long ok = responses.stream().filter(r -> r.getResponse() == ChecklistResponse.ResponseType.OK).count();
            long nok = responses.stream().filter(r -> r.getResponse() == ChecklistResponse.ResponseType.NOK).count();
            long na = responses.stream().filter(r -> r.getResponse() == ChecklistResponse.ResponseType.NA).count();
            filledCount = (int) (ok + nok + na);
            scorePercent = filledCount > 0 ? (int) Math.round((double) ok / filledCount * 100) : null;
        }

        return AuditDto.builder()
                .id(audit.getId())
                .date(audit.getDate())
                .lineZone(audit.getLineZone())
                .templateId(audit.getTemplate() != null ? audit.getTemplate().getId() : null)
                .templateTitle(audit.getTemplate() != null ? audit.getTemplate().getTitle() : null)
                .templateItemCount(templateItemCount)
                .assignedEmployeeId(audit.getAssignedEmployee() != null ? audit.getAssignedEmployee().getId() : null)
                .assignedEmployeeName(audit.getAssignedEmployee() != null ? audit.getAssignedEmployee().getFullName() : null)
                .assignedEmployeeMatricule(audit.getAssignedEmployee() != null ? audit.getAssignedEmployee().getMatricule() : null)
                .assignedEmployeeEmail(audit.getAssignedEmployee() != null ? audit.getAssignedEmployee().getEmail() : null)
                .status(audit.getStatus())
                .notes(audit.getNotes())
                .instanceId(audit.getInstance() != null ? audit.getInstance().getId() : null)
                .instance(audit.getInstance() != null ? instanceService.toDto(audit.getInstance()) : null)
                .createdAt(audit.getCreatedAt())
                .startedAt(audit.getStartedAt())
                .completedAt(audit.getCompletedAt())
                .reminder24hSent(audit.isReminder24hSent())
                .reminderDaySent(audit.isReminderDaySent())
                .completedLate(audit.isCompletedLate())
                .filledCount(filledCount)
                .totalCount(totalCount)
                .scorePercent(scorePercent)
                .build();
    }

    private AuditActivityLogDto toActivityDto(AuditActivityLog l) {
        String performedByName = null;
        if (l.getPerformedById() != null) {
            performedByName = userRepository.findById(l.getPerformedById())
                    .map(u -> u.getEmployee() != null ? u.getEmployee().getFullName() : u.getUsername())
                    .orElse(null);
        }
        return AuditActivityLogDto.builder()
                .id(l.getId())
                .auditId(l.getAuditId())
                .eventType(l.getEventType())
                .performedById(l.getPerformedById())
                .performedByName(performedByName)
                .performedAt(l.getPerformedAt())
                .detail(l.getDetail())
                .build();
    }
}
