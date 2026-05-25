
package tn.sage.rh;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import tn.sage.rh.auth.AuthenticationService;
import tn.sage.rh.auth.dto.RegisterRequestDto;
import tn.sage.rh.employee.Civility;
import tn.sage.rh.employee.EmployeeService;
import tn.sage.rh.employee.dto.EmployeeRequestDto;
import tn.sage.rh.user.UserRepository;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.TimeZone;

import static tn.sage.rh.user.UserRole.ADMIN;
import static tn.sage.rh.user.UserRole.OPERATIONAL_MANAGER;

@SpringBootApplication
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
@EnableScheduling
@EnableAsync
public class RhApplication {

    public static void main(String[] args) {
        SpringApplication.run(RhApplication.class, args);
    }

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone(ZoneId.of("Africa/Tunis")));
    }

    @Bean
    public CommandLineRunner commandLineRunner(
            AuthenticationService authenticationService,
            EmployeeService employeeService,
            UserRepository userRepository
    ) {
        return args -> {

            /* ================= ADMIN (BASMA) ================= */
            try {
                var employee = EmployeeRequestDto.builder()
                        .matricule("1179")
                        .civility(Civility.MLLE)
                        .fullName("HAMRAOUI BASMA")
                        .department("RESSOURCES HUMAINES")
                        .jobTitle("RESPONSABLE RESSOURCES HUMAINES")
                        .employmentType("CADRE")
                        .hireDate(LocalDate.of(2022, 11, 1))
                        .build();
                employeeService.save(employee);

                var admin = RegisterRequestDto.builder()
                        .matricule("1179")
                        .password("1179")
                        .role(ADMIN)
                        .build();

                authenticationService.register(admin);
                System.out.println("ADMIN initialisé (Basma créée).");
            } catch (Exception e) {
                System.out.println("ADMIN existe déjà (Basma déjà créée).");
            }

            //  Assurer que Basma est toujours ADMIN même si elle existait déjà
            userRepository.findByEmployee_Matricule("1179")
                    .ifPresent(user -> {
                        if (user.getRole() != ADMIN) {
                            user.setRole(ADMIN);
                            userRepository.save(user);
                            System.out.println("ADMIN appliqué à BASMA (mise à jour du rôle).");
                        }
                    });

            /* ================= OPERATIONAL MANAGER (HEDI - matricule 12) ================= */
            try {
                // 1) créer l'employé 12 s'il n'existe pas
                var employeeHedi = EmployeeRequestDto.builder()
                        .matricule("12")
                        .fullName("HEDI")                     // 🔧 nom complet réel
                        .department("OPERATIONS")             // 🔧 département réel
                        .jobTitle("OPERATIONAL MANAGER")
                        .employmentType("CADRE")
                        .hireDate(LocalDate.of(2020, 1, 1))   // 🔧 date réelle
                        .build();
                employeeService.save(employeeHedi);

                // 2) créer l'utilisateur 12 en OPERATIONAL_MANAGER
                var hediUser = RegisterRequestDto.builder()
                        .matricule("12")
                        .password("12") // ⚠️ à changer en prod
                        .role(OPERATIONAL_MANAGER)
                        .build();

                authenticationService.register(hediUser);
                System.out.println("OPERATIONAL_MANAGER initialisé (utilisateur 12 créé).");
            } catch (Exception e) {
                System.out.println("Utilisateur 12 existe déjà (employé / user déjà créés).");
            }

            // ⭐ Assurer que 12 est toujours OPERATIONAL_MANAGER même s'il existait déjà
            userRepository.findByEmployee_Matricule("12")
                    .ifPresent(user -> {
                        if (user.getRole() != OPERATIONAL_MANAGER) {
                            user.setRole(OPERATIONAL_MANAGER);
                            userRepository.save(user);
                            System.out.println("OPERATIONAL_MANAGER appliqué à 12 (mise à jour du rôle).");
                        }
                    });

            /* ================= OPERATIONAL MANAGER (MONCEF - matricule 1180) ================= */
            try {
                // 1) créer l'employé 1180 s'il n'existe pas
                var employeeMoncef = EmployeeRequestDto.builder()
                        .matricule("1180")

                        .fullName("MONCEF")                    // 🔧 nom complet réel
                        .department("OPERATIONS")              // 🔧 département réel
                        .jobTitle("OPERATIONAL MANAGER")
                        .employmentType("CADRE")
                        .hireDate(LocalDate.of(2020, 1, 1))    // 🔧 date réelle
                        .build();
                employeeService.save(employeeMoncef);

                // 2) créer l'utilisateur 1180 en OPERATIONAL_MANAGER
                var moncefUser = RegisterRequestDto.builder()
                        .matricule("1180")
                        .password("1180") // ⚠️ à changer en prod
                        .role(OPERATIONAL_MANAGER)
                        .build();

                authenticationService.register(moncefUser);
                System.out.println("OPERATIONAL_MANAGER initialisé (utilisateur 1180 créé).");
            } catch (Exception e) {
                System.out.println("Utilisateur 1180 existe déjà (employé / user déjà créés).");
            }

            // ⭐ Assurer que 1180 est toujours OPERATIONAL_MANAGER même s'il existait déjà
            userRepository.findByEmployee_Matricule("1180")
                    .ifPresent(user -> {
                        if (user.getRole() != OPERATIONAL_MANAGER) {
                            user.setRole(OPERATIONAL_MANAGER);
                            userRepository.save(user);
                            System.out.println("OPERATIONAL_MANAGER appliqué à 1180 (mise à jour du rôle).");
                        }
                    });
        };
    }
}
 