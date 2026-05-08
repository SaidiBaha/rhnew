package tn.sage.rh.hse.checklist.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistAssignmentDto {
    private Long id;
    private String action;
    private String responsable;
    private LocalDate delai;
    private LocalDate dateRealisation;
}
