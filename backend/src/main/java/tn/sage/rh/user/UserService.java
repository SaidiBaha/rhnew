package tn.sage.rh.user;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.user.dto.UpdateUserRequest;
import tn.sage.rh.user.dto.UserActivityLogDto;
import tn.sage.rh.user.dto.UserAdminDto;
import tn.sage.rh.user.dto.UserStatsDto;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static tn.sage.rh.user.UserRole.ADMIN;
import static tn.sage.rh.user.UserRole.SUPERVISOR;

@Service
@RequiredArgsConstructor
public class UserService {
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final UserActivityLogRepository activityLogRepository;
    public void changePassword(ChangePasswordRequest request, Principal connectedUser) {

        var user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalStateException("Mot de passe actuel incorrect");
        }

        if (!request.getNewPassword().equals(request.getConfirmationPassword())) {
            throw new IllegalStateException("Les mots de passe ne correspondent pas");
        }

        if (request.getNewPassword().length() < 8) {
            throw new IllegalStateException("Le mot de passe doit contenir au minimum 8 caractères");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public void batchCreate(List<Employee> employees) {
        Set<String> matricules = employees.stream()
                .map(Employee::getMatricule)
                .collect(Collectors.toSet());

        Set<String> existingUsers = userRepository.findByEmployee_MatriculeIn(matricules);

        List<User> users = employees.stream()
                .filter(e -> !existingUsers.contains(e.getMatricule()))
                .map(this::toUser)
                .collect(Collectors.toList());

        if (!users.isEmpty()) {
            userRepository.saveAll(users);
        }
    }

    private User toUser(Employee employee) {
        return User.builder()
                .employee(employee)
                .password(passwordEncoder.encode(employee.getMatricule()))
                .role(determineRole(employee))
                .build();
    }

    private static UserRole determineRole(Employee employee) {
        if (employee.getJobTitle() != null
                && "AIDE SOIGNANTE".equalsIgnoreCase(employee.getJobTitle().getTitle())) {
            return UserRole.NURSE;
        }
        return UserRole.SUPERVISOR;
    }

    public void validateAuthorization(User user, String matricule) {
        if (user.getRole() == ADMIN) {
            return;
        }

        if (user.getRole() == SUPERVISOR) {
            if (user.getUsername().equals(matricule)) {
                return;
            }

            boolean isOperator = user
                    .getEmployee()
                    .getOperators()
                    .stream()
                    .anyMatch(operator -> operator.getMatricule().equals(matricule));

            if (isOperator) {
                return;
            }
        }

        throw new IllegalStateException("Unauthorized");
    }

    public User getManagedUser(Principal connectedUser) {
        User principalUser = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();

        return userRepository
                .findById(principalUser.getId())
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found"));
    }

    /* ─── Admin : liste et stats ──────────────────────────── */

    public List<UserAdminDto> findAllForAdmin() {
        return userRepository.findAll().stream()
                .map(this::toAdminDto)
                .collect(Collectors.toList());
    }

    public UserStatsDto getStats() {
        List<User> all = userRepository.findAll();
        long total   = all.size();
        long blocked = all.stream().filter(User::isBlocked).count();
        long active  = total - blocked;

        LocalDateTime startOfToday = LocalDateTime.now().toLocalDate().atStartOfDay();
        long connectedToday = activityLogRepository.countConnectedSince(startOfToday);

        Map<String, Long> byRole = all.stream()
                .collect(Collectors.groupingBy(u -> u.getRole().name(), Collectors.counting()));

        return UserStatsDto.builder()
                .totalUsers(total)
                .activeUsers(active)
                .blockedUsers(blocked)
                .connectedToday(connectedToday)
                .byRole(byRole)
                .build();
    }

    /* ─── Admin : blocage ─────────────────────────────────── */

    public UserAdminDto blockUser(Long id, boolean block, String byWho) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur introuvable"));
        user.setBlocked(block);
        userRepository.save(user);

        String event  = block ? "ACCOUNT_BLOCKED" : "ACCOUNT_UNBLOCKED";
        String detail = (block ? "Compte bloqué" : "Compte débloqué") + " par " + byWho;
        activityLogRepository.save(UserActivityLog.builder()
                .user(user)
                .eventType(event)
                .detail(detail)
                .createdAt(LocalDateTime.now())
                .build());

        return toAdminDto(user);
    }

    /* ─── Admin : modifier rôle / email ──────────────────── */

    public UserAdminDto updateUser(Long id, UpdateUserRequest req, String byWho) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur introuvable"));

        if (req.getRole() != null && req.getRole() != user.getRole()) {
            String detail = "Rôle changé de " + user.getRole().name() + " vers " + req.getRole().name() + " par " + byWho;
            activityLogRepository.save(UserActivityLog.builder()
                    .user(user)
                    .eventType("ROLE_CHANGED")
                    .detail(detail)
                    .createdAt(LocalDateTime.now())
                    .build());
            user.setRole(req.getRole());
        }

        if (req.getEmail() != null) {
            user.getEmployee().setEmail(req.getEmail().isBlank() ? null : req.getEmail().trim());
        }

        userRepository.save(user);
        return toAdminDto(user);
    }

    /* ─── Admin : historique activité ────────────────────── */

    public Page<UserActivityLogDto> getActivity(Long userId, String eventType,
                                                LocalDateTime from, LocalDateTime to,
                                                Pageable pageable) {
        return activityLogRepository
                .findFiltered(userId, eventType, from, to, pageable)
                .map(this::toLogDto);
    }

    /* ─── Mapping privé ──────────────────────────────────── */

    private UserAdminDto toAdminDto(User u) {
        return UserAdminDto.builder()
                .id(u.getId())
                .matricule(u.getUsername())
                .fullName(u.getEmployee() != null ? u.getEmployee().getFullName() : null)
                .email(u.getEmployee() != null ? u.getEmployee().getEmail() : null)
                .role(u.getRole().name())
                .blocked(u.isBlocked())
                .lastLoginAt(u.getLastLoginAt())
                .lastActivityAt(u.getLastActivityAt())
                .lastActivityIp(u.getLastActivityIp())
                .build();
    }

    private UserActivityLogDto toLogDto(UserActivityLog l) {
        return UserActivityLogDto.builder()
                .id(l.getId())
                .eventType(l.getEventType())
                .ipAddress(l.getIpAddress())
                .userAgent(l.getUserAgent())
                .detail(l.getDetail())
                .createdAt(l.getCreatedAt())
                .build();
    }
}
