package tn.sage.rh.employee.event;

import lombok.AllArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.salary.service.SalaryAdvanceService;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

import tn.sage.rh.user.UserRole;

@Component
@AllArgsConstructor
public class EmployeeCreationListener {
    private final SalaryAdvanceService salaryAdvanceService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener
    public void onEvent(EmployeeCreationEvent event) {
        Employee employee = event.getEmployee();

        salaryAdvanceService.create(employee);

        if (userRepository.findByEmployee_Matricule(employee.getMatricule()).isEmpty()) {
            User user = User.builder()
                    .employee(event.getEmployee())
                    .password(passwordEncoder.encode(employee.getMatricule()))
                    .role(determineRole(employee))
                    .build();
            userRepository.save(user);
        }
    }

    private static UserRole determineRole(Employee employee) {
        if (employee.getJobTitle() != null
                && "AIDE SOIGNANTE".equalsIgnoreCase(employee.getJobTitle().getTitle())) {
            return UserRole.NURSE;
        }
        return UserRole.SUPERVISOR;
    }
}
