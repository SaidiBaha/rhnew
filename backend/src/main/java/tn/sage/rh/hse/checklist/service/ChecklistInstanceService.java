package tn.sage.rh.hse.checklist.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.hse.audit.entity.Audit;
import tn.sage.rh.hse.audit.repository.AuditRepository;
import tn.sage.rh.hse.checklist.dto.*;
import tn.sage.rh.hse.checklist.entity.*;
import tn.sage.rh.hse.checklist.repository.ChecklistInstanceRepository;
import tn.sage.rh.hse.checklist.repository.ChecklistItemRepository;
import tn.sage.rh.hse.checklist.repository.ChecklistTemplateRepository;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChecklistInstanceService {

    private final ChecklistInstanceRepository instanceRepository;
    private final ChecklistTemplateRepository templateRepository;
    private final ChecklistItemRepository itemRepository;
    private final UserRepository userRepository;
    private final AuditRepository auditRepository;

    public Page<ChecklistInstanceDto> findAll(int page, int size) {
        return instanceRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .map(this::toDto);
    }

    public ChecklistInstanceDto findById(Long id) {
        return toDto(findInstance(id));
    }

    @Transactional
    public ChecklistInstanceDto create(SaveInstanceRequest request, Principal principal) {
        ChecklistTemplate template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new InvalidEntityException("Modèle introuvable"));
        User user = resolveUser(principal);

        ChecklistInstance instance = ChecklistInstance.builder()
                .template(template)
                .auditId(request.getAuditId())
                .date(request.getDate())
                .lineUnit(request.getLineUnit())
                .teamLeader(request.getTeamLeader())
                .auditor(request.getAuditor())
                .auditorVisa(request.getAuditorVisa())
                .lineResponsible(request.getLineResponsible())
                .status(request.getStatus() != null ? request.getStatus() : ChecklistInstance.InstanceStatus.BROUILLON)
                .createdBy(user)
                .responses(new ArrayList<>())
                .assignments(new ArrayList<>())
                .build();

        applyResponses(instance, request.getResponses());
        applyAssignments(instance, request.getAssignments());

        ChecklistInstance saved = instanceRepository.save(instance);

        // Lier l'instance à l'audit (mise à jour de la FK instance_id sur la table audits)
        if (request.getAuditId() != null) {
            auditRepository.findById(request.getAuditId()).ifPresent(audit -> {
                audit.setInstance(saved);
                auditRepository.save(audit);
            });
        }

        return toDto(saved);
    }

    @Transactional
    public ChecklistInstanceDto update(Long id, SaveInstanceRequest request) {
        ChecklistInstance instance = findInstance(id);
        if (request.getAuditId() != null) instance.setAuditId(request.getAuditId());
        instance.setDate(request.getDate());
        instance.setLineUnit(request.getLineUnit());
        instance.setTeamLeader(request.getTeamLeader());
        instance.setAuditor(request.getAuditor());
        instance.setAuditorVisa(request.getAuditorVisa());
        instance.setLineResponsible(request.getLineResponsible());
        if (request.getStatus() != null) instance.setStatus(request.getStatus());

        instance.getResponses().clear();
        instance.getAssignments().clear();
        applyResponses(instance, request.getResponses());
        applyAssignments(instance, request.getAssignments());

        ChecklistInstance saved = instanceRepository.save(instance);

        // Réparer le lien audit → instance si la FK instance_id est absente (données cassées antérieures)
        if (request.getAuditId() != null) {
            auditRepository.findById(request.getAuditId()).ifPresent(audit -> {
                if (audit.getInstance() == null) {
                    audit.setInstance(saved);
                    auditRepository.save(audit);
                }
            });
        }

        return toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        findInstance(id);
        instanceRepository.deleteById(id);
    }

    /* ── helpers ── */

    private ChecklistInstance findInstance(Long id) {
        return instanceRepository.findById(id)
                .orElseThrow(() -> new InvalidEntityException("Instance de checklist introuvable"));
    }

    private User resolveUser(Principal principal) {
        if (principal == null) return null;
        return userRepository.findByEmployee_Matricule(principal.getName()).orElse(null);
    }

    private void applyResponses(ChecklistInstance instance, List<SaveInstanceRequest.ResponseRequest> reqs) {
        if (reqs == null) return;
        // build item id → item map from the template for validation
        Map<Long, ChecklistItem> itemMap = instance.getTemplate().getCategories().stream()
                .flatMap(c -> c.getItems().stream())
                .collect(Collectors.toMap(ChecklistItem::getId, i -> i));

        for (SaveInstanceRequest.ResponseRequest req : reqs) {
            ChecklistItem item = itemMap.get(req.getItemId());
            if (item == null) item = itemRepository.findById(req.getItemId()).orElse(null);
            if (item == null) continue;
            instance.getResponses().add(ChecklistResponse.builder()
                    .instance(instance)
                    .item(item)
                    .response(req.getResponse())
                    .ecartDescription(req.getEcartDescription())
                    .build());
        }
    }

    private void applyAssignments(ChecklistInstance instance, List<SaveInstanceRequest.AssignmentRequest> reqs) {
        if (reqs == null) return;
        for (SaveInstanceRequest.AssignmentRequest req : reqs) {
            instance.getAssignments().add(ChecklistAssignment.builder()
                    .instance(instance)
                    .action(req.getAction())
                    .responsable(req.getResponsable())
                    .delai(req.getDelai())
                    .dateRealisation(req.getDateRealisation())
                    .build());
        }
    }

    public ChecklistInstanceDto toDto(ChecklistInstance inst) {
        List<ChecklistResponseDto> responses = inst.getResponses() == null ? List.of() :
                inst.getResponses().stream().map(r -> ChecklistResponseDto.builder()
                        .id(r.getId())
                        .itemId(r.getItem().getId())
                        .itemLabel(r.getItem().getLabel())
                        .response(r.getResponse())
                        .ecartDescription(r.getEcartDescription())
                        .build()).toList();

        List<ChecklistAssignmentDto> assignments = inst.getAssignments() == null ? List.of() :
                inst.getAssignments().stream().map(a -> ChecklistAssignmentDto.builder()
                        .id(a.getId())
                        .action(a.getAction())
                        .responsable(a.getResponsable())
                        .delai(a.getDelai())
                        .dateRealisation(a.getDateRealisation())
                        .build()).toList();

        return ChecklistInstanceDto.builder()
                .id(inst.getId())
                .templateId(inst.getTemplate() != null ? inst.getTemplate().getId() : null)
                .templateTitle(inst.getTemplate() != null ? inst.getTemplate().getTitle() : null)
                .auditId(inst.getAuditId())
                .date(inst.getDate())
                .lineUnit(inst.getLineUnit())
                .teamLeader(inst.getTeamLeader())
                .auditor(inst.getAuditor())
                .auditorVisa(inst.getAuditorVisa())
                .lineResponsible(inst.getLineResponsible())
                .status(inst.getStatus())
                .createdAt(inst.getCreatedAt())
                .responses(responses)
                .assignments(assignments)
                .build();
    }
}
