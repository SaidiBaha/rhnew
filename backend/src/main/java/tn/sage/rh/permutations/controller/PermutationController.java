package tn.sage.rh.permutations.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.permutations.dto.PermutationCreateRequestDTO;
import tn.sage.rh.permutations.dto.PermutationResponseDTO;
import tn.sage.rh.permutations.service.PermutationService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/permutations")
@RequiredArgsConstructor
public class PermutationController {

    private final PermutationService permutationService;

    @GetMapping
    public ResponseEntity<List<PermutationResponseDTO>> getForCurrentUser() {
        return ResponseEntity.ok(permutationService.getPermutationsForCurrentUser());
    }

    @PostMapping
    public ResponseEntity<List<PermutationResponseDTO>> create(
            @Valid @RequestBody PermutationCreateRequestDTO dto
    ) {
        return ResponseEntity.ok(permutationService.create(dto));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<PermutationResponseDTO> accept(@PathVariable Long id) {
        return ResponseEntity.ok(permutationService.accept(id));
    }

    @PostMapping("/{id}/refuse")
    public ResponseEntity<PermutationResponseDTO> refuse(@PathVariable Long id) {
        return ResponseEntity.ok(permutationService.refuse(id));
    }
}
