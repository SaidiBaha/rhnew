package tn.sage.rh.permutations.dto;

import lombok.*;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import tn.sage.rh.permutations.entity.TypePermutation;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PermutationCreateRequestDTO {

    @NotEmpty
    private List<Long> operatorIds;

   // private Long senderId;    // Pour RECEVOIR (optionnel)

    private Long senderId;
    private Long receiverId;

    private Long productionLineId;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    @NotNull
    private LocalTime startTime;

    @NotNull
    private LocalTime endTime;
    @NotNull
    @Builder.Default
    private TypePermutation typePermutation = TypePermutation.ENVOYER;

}
