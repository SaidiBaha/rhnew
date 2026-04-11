package tn.sage.rh.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class EvolutionPointDto {
    private String date;
    private long present;
    private long absent;
    private long pending;
}
