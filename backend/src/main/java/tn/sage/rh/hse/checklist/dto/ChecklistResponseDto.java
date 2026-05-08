package tn.sage.rh.hse.checklist.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.sage.rh.hse.checklist.entity.ChecklistResponse;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistResponseDto {
    private Long id;
    private Long itemId;
    private String itemLabel;
    private ChecklistResponse.ResponseType response;
    private String ecartDescription;
}
