package tn.sage.rh.permutations.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarkFreeOperatorsRequestDTO {

    @NotEmpty
    private List<Long> operatorIds;

    // jour de FREE (ex: 2026-02-15)
    @NotNull
    private LocalDate day;

    // optionnel: si tu veux stocker des horaires
    @Builder.Default
    private LocalTime startTime = LocalTime.of(0, 0);

    @Builder.Default
    private LocalTime endTime = LocalTime.of(23, 59);
}
