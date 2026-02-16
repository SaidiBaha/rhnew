// =======================================================
// 1) PermutationCreateRequestDTO.java  ✅ (RECEVOIR: pas de senderId)
// =======================================================
package tn.sage.rh.permutations.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import tn.sage.rh.permutations.entity.TypePermutation;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PermutationCreateRequestDTO {

    @NotEmpty
    private List<Long> operatorIds;

    private Long receiverId; // ENVOYER seulement (receiver)

    private Long productionLineId;

    private LocalDate startDate; // ENVOYER seulement
    private LocalDate endDate;   // ENVOYER seulement

    @NotNull
    private LocalTime startTime;

    @NotNull
    private LocalTime endTime;

    @NotNull
    @Builder.Default
    private TypePermutation typePermutation = TypePermutation.ENVOYER;
}
