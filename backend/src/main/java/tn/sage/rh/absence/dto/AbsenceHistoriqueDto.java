package tn.sage.rh.absence.dto;

import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AbsenceHistoriqueDto {
    private LocalDate date;
    private long total;
    private long present;
    private long absent;
    private long pending;
}