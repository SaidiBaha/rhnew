package tn.sage.rh.permutations.service;
import tn.sage.rh.permutations.dto.PermutationCreateRequestDTO;
import tn.sage.rh.permutations.dto.PermutationResponseDTO;

import java.util.List;

public interface PermutationService {
    List<PermutationResponseDTO> getPermutationsForCurrentUser();
    List<PermutationResponseDTO> create(PermutationCreateRequestDTO dto);
    PermutationResponseDTO accept(Long id);
    PermutationResponseDTO refuse(Long id);
}
