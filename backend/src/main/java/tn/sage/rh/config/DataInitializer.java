package tn.sage.rh.config;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tn.sage.rh.employee.Civility;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.organization.entity.Department;
import tn.sage.rh.organization.entity.EmploymentType;
import tn.sage.rh.organization.entity.JobTitle;
import tn.sage.rh.organization.repository.DepartmentRepository;
import tn.sage.rh.organization.repository.EmploymentTypeRepository;
import tn.sage.rh.organization.repository.JobTitleRepository;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;
import tn.sage.rh.user.UserRole;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository           userRepository;
    private final EmployeeRepository       employeeRepository;
    private final DepartmentRepository     departmentRepository;
    private final JobTitleRepository       jobTitleRepository;
    private final EmploymentTypeRepository employmentTypeRepository;
    private final PasswordEncoder          passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Department     itDept     = getOrCreateDepartment("IT");
        JobTitle       itJob      = getOrCreateJobTitle("INGENIEUR IT");
        EmploymentType cadreType  = getOrCreateEmploymentType("CADRE");

        initAccount("3744", "SAIIDI BAHA EDDINE", Civility.MONSIEUR,
                LocalDate.of(2026, 1, 5),  itDept, itJob, cadreType,
                UserRole.SUPER_ADMIN, "SuperAdmin@3744");

        initAccount("1382", "OTHMANI BOULBABA", Civility.MONSIEUR,
                LocalDate.of(2023, 3, 23), itDept, itJob, cadreType,
                UserRole.PLANIFICATEUR, "Planif@1382");

        backfillNurseRole();
    }

    /**
     * Backfill : met à jour les utilisateurs ayant le rôle SUPERVISOR
     * dont le poste occupé est "AIDE SOIGNANTE" → NURSE.
     * Opération idempotente.
     */
    private void backfillNurseRole() {
        var toUpdate = userRepository.findByRoleAndEmployeeJobTitle(UserRole.SUPERVISOR, "AIDE SOIGNANTE");
        if (toUpdate.isEmpty()) return;

        toUpdate.forEach(u -> u.setRole(UserRole.NURSE));
        userRepository.saveAll(toUpdate);
        log.info("[DataInitializer] Backfill NURSE : {} compte(s) mis à jour.", toUpdate.size());
    }

    // ── Account bootstrapping ────────────────────────────────────────────────

    private void initAccount(String matricule, String fullName, Civility civility,
                             LocalDate hireDate, Department dept, JobTitle jobTitle,
                             EmploymentType empType, UserRole targetRole, String defaultPassword) {

        userRepository.findByEmployee_Matricule(matricule).ifPresentOrElse(
            user -> {
                if (user.getRole() != targetRole) {
                    UserRole ancien = user.getRole();
                    user.setRole(targetRole);
                    userRepository.save(user);
                    log.warn("[DataInitializer] Matricule {} : rôle mis à jour {} → {}",
                            matricule, ancien, targetRole);
                } else {
                    log.info("[DataInitializer] Matricule {} ({}) : déjà correct, aucune modification.",
                            matricule, targetRole);
                }
            },
            () -> {
                Employee employee = employeeRepository.findByMatricule(matricule).orElseGet(() -> {
                    Employee emp = Employee.builder()
                            .matricule(matricule)
                            .civility(civility)
                            .fullName(fullName)
                            .hireDate(hireDate)
                            .department(dept)
                            .jobTitle(jobTitle)
                            .employmentType(empType)
                            .free(false)
                            .deleted(false)
                            .build();
                    return employeeRepository.save(emp);
                });

                User newUser = User.builder()
                        .employee(employee)
                        .role(targetRole)
                        .password(passwordEncoder.encode(defaultPassword))
                        .build();
                userRepository.save(newUser);
                log.info("[DataInitializer] Compte {} créé (matricule {} — {}).",
                        targetRole, matricule, fullName);
            }
        );
    }

    // ── Référentiels (find-or-create) ────────────────────────────────────────

    private Department getOrCreateDepartment(String name) {
        return departmentRepository.findByName(name).orElseGet(() -> {
            Department d = Department.builder().name(name).build();
            return departmentRepository.save(d);
        });
    }

    private JobTitle getOrCreateJobTitle(String title) {
        return jobTitleRepository.findByTitle(title).orElseGet(() -> {
            JobTitle jt = JobTitle.builder().title(title).build();
            return jobTitleRepository.save(jt);
        });
    }

    private EmploymentType getOrCreateEmploymentType(String type) {
        return employmentTypeRepository.findByType(type).orElseGet(() -> {
            EmploymentType et = EmploymentType.builder().type(type).build();
            return employmentTypeRepository.save(et);
        });
    }
}
