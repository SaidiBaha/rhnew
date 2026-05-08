package tn.sage.rh.hse.checklist.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.hse.checklist.dto.*;
import tn.sage.rh.hse.checklist.entity.ChecklistCategory;
import tn.sage.rh.hse.checklist.entity.ChecklistItem;
import tn.sage.rh.hse.checklist.entity.ChecklistTemplate;
import tn.sage.rh.hse.checklist.repository.ChecklistTemplateRepository;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChecklistTemplateService {

    private final ChecklistTemplateRepository templateRepository;
    private final UserRepository userRepository;

    public List<ChecklistTemplateSummaryDto> findAll() {
        return templateRepository.findAll().stream()
                .map(this::toSummaryDto)
                .toList();
    }

    public ChecklistTemplateDto findById(Long id) {
        return toDto(findTemplate(id));
    }

    @Transactional
    public ChecklistTemplateDto create(SaveTemplateRequest request, Principal principal) {
        validate(request);
        User user = resolveUser(principal);
        ChecklistTemplate template = ChecklistTemplate.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .createdBy(user)
                .categories(new ArrayList<>())
                .build();
        applyCategories(template, request.getCategories());
        return toDto(templateRepository.save(template));
    }

    @Transactional
    public ChecklistTemplateDto update(Long id, SaveTemplateRequest request) {
        validate(request);
        ChecklistTemplate template = findTemplate(id);
        template.setTitle(request.getTitle().trim());
        template.setDescription(request.getDescription());
        template.getCategories().clear();
        applyCategories(template, request.getCategories());
        return toDto(templateRepository.save(template));
    }

    @Transactional
    public void delete(Long id) {
        findTemplate(id);
        templateRepository.deleteById(id);
    }

    /* ── helpers ── */

    private ChecklistTemplate findTemplate(Long id) {
        return templateRepository.findById(id)
                .orElseThrow(() -> new InvalidEntityException("Modèle de checklist introuvable"));
    }

    private void validate(SaveTemplateRequest request) {
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new InvalidEntityException("Le titre est obligatoire");
        }
    }

    private User resolveUser(Principal principal) {
        if (principal == null) return null;
        return userRepository.findByEmployee_Matricule(principal.getName()).orElse(null);
    }

    private void applyCategories(ChecklistTemplate template, List<SaveTemplateRequest.CategoryRequest> catReqs) {
        if (catReqs == null) return;
        for (int ci = 0; ci < catReqs.size(); ci++) {
            SaveTemplateRequest.CategoryRequest catReq = catReqs.get(ci);
            ChecklistCategory cat = ChecklistCategory.builder()
                    .template(template)
                    .name(catReq.getName())
                    .orderIndex(ci)
                    .items(new ArrayList<>())
                    .build();
            if (catReq.getItems() != null) {
                for (int ii = 0; ii < catReq.getItems().size(); ii++) {
                    SaveTemplateRequest.ItemRequest itemReq = catReq.getItems().get(ii);
                    cat.getItems().add(ChecklistItem.builder()
                            .category(cat)
                            .label(itemReq.getLabel())
                            .orderIndex(ii)
                            .build());
                }
            }
            template.getCategories().add(cat);
        }
    }

    private ChecklistTemplateSummaryDto toSummaryDto(ChecklistTemplate t) {
        int itemCount = t.getCategories() == null ? 0 :
                t.getCategories().stream().mapToInt(c -> c.getItems() == null ? 0 : c.getItems().size()).sum();
        return ChecklistTemplateSummaryDto.builder()
                .id(t.getId())
                .title(t.getTitle())
                .description(t.getDescription())
                .categoryCount(t.getCategories() == null ? 0 : t.getCategories().size())
                .itemCount(itemCount)
                .createdAt(t.getCreatedAt())
                .build();
    }

    public ChecklistTemplateDto toDto(ChecklistTemplate t) {
        List<ChecklistCategoryDto> cats = t.getCategories() == null ? List.of() :
                t.getCategories().stream().map(cat -> ChecklistCategoryDto.builder()
                        .id(cat.getId())
                        .name(cat.getName())
                        .orderIndex(cat.getOrderIndex())
                        .items(cat.getItems() == null ? List.of() : cat.getItems().stream()
                                .map(item -> ChecklistItemDto.builder()
                                        .id(item.getId())
                                        .label(item.getLabel())
                                        .orderIndex(item.getOrderIndex())
                                        .build())
                                .toList())
                        .build()).toList();
        return ChecklistTemplateDto.builder()
                .id(t.getId())
                .title(t.getTitle())
                .description(t.getDescription())
                .createdByName(t.getCreatedBy() != null && t.getCreatedBy().getEmployee() != null
                        ? t.getCreatedBy().getEmployee().getFullName() : null)
                .createdAt(t.getCreatedAt())
                .categories(cats)
                .build();
    }
}
