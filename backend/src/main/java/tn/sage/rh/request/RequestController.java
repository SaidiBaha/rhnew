package tn.sage.rh.request;

import lombok.RequiredArgsConstructor;
import org.mapstruct.factory.Mappers;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.request.dto.BulkStatusResultDto;
import tn.sage.rh.request.dto.BulkStatusUpdateDto;
import tn.sage.rh.request.dto.PatchStatusDto;
import tn.sage.rh.request.dto.RequestDto;
import tn.sage.rh.request.dto.SaveRequestInputDto;
import tn.sage.rh.request.mapper.RequestMapper;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/requests")
@RequiredArgsConstructor
public class RequestController {
    private final RequestMapper requestMapper = Mappers.getMapper(RequestMapper.class);
    private final RequestService requestService;

    @GetMapping
    public ResponseEntity<List<RequestDto>> findAllRequests(Principal connectedUser) {
        return ResponseEntity.ok(requestService
                .findAll(connectedUser)
                .stream()
                .map(requestMapper::toDto)
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequestDto> findById(Principal connectedUser, @PathVariable Long id) {
        return ResponseEntity.ok(
                requestMapper.toDto(requestService.findById(connectedUser, id))
        );
    }

    @PostMapping
    public ResponseEntity<?> save(Principal connectedUser, @RequestBody SaveRequestInputDto saveRequestInput) {
        requestService.save(connectedUser, saveRequestInput);
        return ResponseEntity.accepted().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            Principal connectedUser,
            @PathVariable Long id,
            @RequestBody SaveRequestInputDto saveRequestInput) {
        requestService.update(connectedUser, id, saveRequestInput);
        return ResponseEntity.accepted().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> patchStatus(
            Principal connectedUser,
            @PathVariable Long id,
            @RequestBody PatchStatusDto patchStatusDto) {
        requestService.patchStatus(connectedUser, id, patchStatusDto.getStatus());
        return ResponseEntity.accepted().build();
    }

    @PatchMapping("/bulk-status")
    public ResponseEntity<BulkStatusResultDto> bulkPatchStatus(
            Principal connectedUser,
            @RequestBody BulkStatusUpdateDto bulkDto) {
        return ResponseEntity.ok(requestService.bulkPatchStatus(connectedUser, bulkDto));
    }

}
