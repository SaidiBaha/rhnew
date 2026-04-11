package tn.sage.rh.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AdvanceStatusPointDto {
    private String period;
    private long done;
    private long enCours;
}
