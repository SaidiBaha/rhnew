package tn.sage.rh.hse.checklist.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistCategoryDto {
    private Long id;
    private String name;
    private int orderIndex;
    private List<ChecklistItemDto> items;
}
