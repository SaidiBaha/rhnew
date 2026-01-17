package tn.sage.rh;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
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

            /* ================= ADMIN ================= */
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
                System.out.println("ADMIN initialisé");
            } catch (Exception e) {
                System.out.println("ADMIN existe déjà");
            }

            String hediMatricule = "12";

            userRepository.findByEmployee_Matricule(hediMatricule)
                    .ifPresent(user -> {
                        if (user.getRole() != OPERATIONAL_MANAGER) {
                            user.setRole(OPERATIONAL_MANAGER);
                            userRepository.save(user);
                            System.out.println("OPERATIONAL_MANAGER appliqué à " + hediMatricule);
                        }
                    });
        };
    }
}
