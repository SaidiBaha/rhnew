package tn.sage.rh.user;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import tn.sage.rh.employee.Employee;

import java.security.Principal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static tn.sage.rh.user.UserRole.ADMIN;
import static tn.sage.rh.user.UserRole.SUPERVISOR;

@Service
@RequiredArgsConstructor
public class UserService {
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
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

}
