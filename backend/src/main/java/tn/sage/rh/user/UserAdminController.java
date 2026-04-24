package tn.sage.rh.user;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.user.dto.UpdateUserRequest;
import tn.sage.rh.user.dto.UserActivityLogDto;
import tn.sage.rh.user.dto.UserAdminDto;
import tn.sage.rh.user.dto.UserStatsDto;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class UserAdminController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserAdminDto>> findAll() {
        return ResponseEntity.ok(userService.findAllForAdmin());
    }

    @GetMapping("/stats")
    public ResponseEntity<UserStatsDto> stats() {
        return ResponseEntity.ok(userService.getStats());
    }

    @PatchMapping("/{id}/block")
    public ResponseEntity<UserAdminDto> block(@PathVariable Long id,
                                              @RequestParam boolean blocked,
                                              Principal connectedUser) {
        String byWho = resolveMatricule(connectedUser);
        return ResponseEntity.ok(userService.blockUser(id, blocked, byWho));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserAdminDto> update(@PathVariable Long id,
                                               @RequestBody UpdateUserRequest req,
                                               Principal connectedUser) {
        String byWho = resolveMatricule(connectedUser);
        return ResponseEntity.ok(userService.updateUser(id, req, byWho));
    }

    @GetMapping("/{id}/activity")
    public ResponseEntity<Page<UserActivityLogDto>> activity(
            @PathVariable Long id,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(userService.getActivity(id, eventType, from, to, pageable));
    }

    private String resolveMatricule(Principal connectedUser) {
        if (connectedUser instanceof UsernamePasswordAuthenticationToken token) {
            Object principal = token.getPrincipal();
            if (principal instanceof User user) {
                return user.getUsername();
            }
        }
        return "inconnu";
    }
}
