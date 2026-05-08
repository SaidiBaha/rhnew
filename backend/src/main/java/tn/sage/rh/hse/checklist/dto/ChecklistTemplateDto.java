package tn.sage.rh.hse.checklist.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistTemplateDto {
    private Long id;
    private String title;
    private String description;
    private String createdByName;
    private LocalDateTime createdAt;
    private List<ChecklistCategoryDto> categories;
}
