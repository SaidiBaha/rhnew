package tn.sage.rh.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UnjustifiedAbsenceAlertDto {
    private String matricule;
    private String fullName;
    private int days;
}
