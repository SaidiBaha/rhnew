package tn.sage.rh.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import static org.springframework.http.HttpMethod.*;
import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;
import static tn.sage.rh.user.UserPermission.*;
import static tn.sage.rh.user.UserRole.*;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@EnableMethodSecurity
public class SecurityConfiguration {
    private static final String[] WHITE_LIST_URL = {
            "/api/v1/auth/**",
            "/v2/api-docs",
            "/v3/api-docs",
            "/v3/api-docs/**",
            "/swagger-resources",
            "/swagger-resources/**",
            "/configuration/ui",
            "/configuration/security",
            "/swagger-ui/**",
            "/webjars/**",
            "/swagger-ui.html",
    };
    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;
    private final LogoutHandler logoutHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(req ->
                        req.requestMatchers(WHITE_LIST_URL)
                                .permitAll()

                                .requestMatchers("/api/v1/salary-advances/**").hasAnyRole(ADMIN.name(), SUPERVISOR.name())
                                .requestMatchers(GET, "/api/v1/salary-advances/**").hasAnyAuthority(SALARY_ADVANCE_READ.name())
                                .requestMatchers(POST, "/api/v1/salary-advances/**").hasAnyAuthority(SALARY_ADVANCE_CREATE.name())
                                .requestMatchers(PUT, "/api/v1/salary-advances/**").hasAnyAuthority(SALARY_ADVANCE_UPDATE.name())
                                .requestMatchers(DELETE, "/api/v1/salary-advances/**").hasAnyAuthority(SALARY_ADVANCE_DELETE.name())

                                .requestMatchers(GET, "/api/v1/employees/**")
                                .hasAnyRole(ADMIN.name(), SUPERVISOR.name(), OPERATIONAL_MANAGER.name())
                                .requestMatchers(GET, "/api/v1/employees/**")
                                .hasAnyAuthority(EMPLOYEE_READ.name())

                                .requestMatchers(POST, "/api/v1/employees/**")
                                .hasAnyRole(ADMIN.name(), SUPERVISOR.name())
                                .requestMatchers(POST, "/api/v1/employees/**")
                                .hasAnyAuthority(EMPLOYEE_CREATE.name())

                                .requestMatchers(PUT, "/api/v1/employees/**")
                                .hasAnyRole(ADMIN.name(), SUPERVISOR.name())
                                .requestMatchers(PUT, "/api/v1/employees/**")
                                .hasAnyAuthority(EMPLOYEE_UPDATE.name())

                                .requestMatchers(DELETE, "/api/v1/employees/**")
                                .hasAnyRole(ADMIN.name(), SUPERVISOR.name())
                                .requestMatchers(DELETE, "/api/v1/employees/**")
                                .hasAnyAuthority(EMPLOYEE_DELETE.name())

                                .requestMatchers(GET, "/api/v1/employees/operators/free")
                                .hasAnyRole(ADMIN.name(), SUPERVISOR.name(), OPERATIONAL_MANAGER.name())

                                .requestMatchers(GET, "/api/v1/dashboard/**")
                                .hasAnyRole(ADMIN.name(), OPERATIONAL_MANAGER.name())

                                .requestMatchers("/api/v1/salary-advance-deadlines/**").hasAnyRole(ADMIN.name(), SUPERVISOR.name())
                                .requestMatchers(GET, "/api/v1/salary-advance-deadlines/**").hasAnyAuthority(SALARY_ADVANCE_DEADLINE_READ.name())
                                .requestMatchers(POST, "/api/v1/salary-advance-deadlines/**").hasAnyAuthority(SALARY_ADVANCE_DEADLINE_CREATE.name())
                                .requestMatchers(PUT, "/api/v1/salary-advance-deadlines/**").hasAnyAuthority(SALARY_ADVANCE_DEADLINE_UPDATE.name())
                                .requestMatchers(DELETE, "/api/v1/salary-advance-deadlines/**").hasAnyAuthority(SALARY_ADVANCE_DEADLINE_DELETE.name())

                                .requestMatchers("/api/v1/requests/**").hasAnyRole(ADMIN.name(), SUPERVISOR.name())
                                .requestMatchers(GET, "/api/v1/requests/**").hasAnyAuthority(REQUEST_READ.name())
                                .requestMatchers(POST, "/api/v1/requests/**").hasAnyAuthority(REQUEST_CREATE.name())
                                .requestMatchers(PUT, "/api/v1/requests/**").hasAnyAuthority(REQUEST_UPDATE.name())
                                .requestMatchers(PATCH, "/api/v1/requests/**").hasAnyAuthority(REQUEST_UPDATE.name())

                                .requestMatchers("/api/v1/users/**").hasAnyRole(ADMIN.name(), SUPERVISOR.name(), OPERATIONAL_MANAGER.name())
                                .requestMatchers(PUT, "/api/v1/users/**").authenticated()

                                .requestMatchers("/api/v1/permutations/**").hasAnyRole(ADMIN.name(), SUPERVISOR.name(), OPERATIONAL_MANAGER.name())
                                .requestMatchers(GET, "/api/v1/permutations/**").hasAnyAuthority(PERMUTATION_READ.name())
                                .requestMatchers(POST, "/api/v1/permutations/**").hasAnyAuthority(PERMUTATION_CREATE.name())
                                .requestMatchers(PUT, "/api/v1/permutations/**").hasAnyAuthority(PERMUTATION_UPDATE.name())
                                .requestMatchers(GET, "/api/v1/production-lines/**").authenticated()

                                .anyRequest()
                                .authenticated()
                )
                .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .logout(logout ->
                        logout.logoutUrl("/api/v1/auth/logout")
                                .permitAll()
                                .addLogoutHandler(logoutHandler)
                                .logoutSuccessHandler((request, response, authentication) -> SecurityContextHolder.clearContext())
                );

        return http.build();
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring().requestMatchers(
                "/v3/api-docs/**",
                "/swagger-ui/**",
                "/swagger-ui.html"
        );
    }
}