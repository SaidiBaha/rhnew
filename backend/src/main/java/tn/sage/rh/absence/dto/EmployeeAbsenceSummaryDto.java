package tn.sage.rh.absence.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeAbsenceSummaryDto {
    private String matricule;
    private String fullName;
    private String departement;
    private long joursPresent;
    private long joursAbsent;
}
