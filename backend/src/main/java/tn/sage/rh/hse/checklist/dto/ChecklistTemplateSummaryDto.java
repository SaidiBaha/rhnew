package tn.sage.rh.hse.checklist.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistTemplateSummaryDto {
    private Long id;
    private String title;
    private String description;
    private int categoryCount;
    private int itemCount;
    private LocalDateTime createdAt;
}
