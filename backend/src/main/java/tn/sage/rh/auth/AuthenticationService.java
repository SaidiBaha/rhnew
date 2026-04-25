package tn.sage.rh.auth;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import tn.sage.rh.auth.dto.AuthenticationResponseDto;
import tn.sage.rh.auth.dto.LoginRequestDto;
import tn.sage.rh.auth.dto.RegisterRequestDto;
import tn.sage.rh.auth.dto.ValidateTokenResponseDto;
import tn.sage.rh.config.IpUtils;
import tn.sage.rh.config.JwtService;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.token.Token;
import tn.sage.rh.token.TokenRepository;
import tn.sage.rh.token.TokenType;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserActivityLogService;
import tn.sage.rh.user.UserRepository;

@Service
@RequiredArgsConstructor
public class AuthenticationService {
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final TokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserActivityLogService activityLogService;

    private void saveUserToken(User user, String jwtToken) {
        var token = Token.builder()
                .user(user)
                .token(jwtToken)
                .tokenType(TokenType.BEARER)
                .expired(false)
                .revoked(false)
                .build();
        tokenRepository.save(token);
    }

    private void revokeAllUserTokens(User user) {
        var validUserTokens = tokenRepository.findAllValidTokenByUser(user.getId());
        if (validUserTokens.isEmpty())
            return;
        validUserTokens.forEach(token -> {
            token.setExpired(true);
            token.setRevoked(true);
        });
        tokenRepository.saveAll(validUserTokens);
    }

    public AuthenticationResponseDto refreshToken(
            HttpServletRequest request
    ) {
        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        final String refreshToken;
        final String fullName;
        final String matricule;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new BadCredentialsException("Missing token");
        }

        refreshToken = authHeader.substring(7);
        matricule = jwtService.extractUsername(refreshToken);
        if (matricule != null) {
            var user = this.userRepository.findByEmployee_Matricule(matricule)
                    .orElseThrow();
            if (jwtService.isTokenValid(refreshToken, user)) {
                var accessToken = jwtService.generateToken(user);
                revokeAllUserTokens(user);
                saveUserToken(user, accessToken);
                return AuthenticationResponseDto.builder()
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .user(AuthenticationResponseDto.User.builder()
                                .id(user.getId())
                                .matricule(user.getUsername())

                                .role(user.getRole()).build())

                        .build();
            }
        }

        throw new BadCredentialsException("Invalid token");
    }

    public AuthenticationResponseDto register(RegisterRequestDto request) {
        var employee = employeeRepository
                .findByMatricule(request.getMatricule())
                .orElseThrow(() -> new UsernameNotFoundException("Employee not found"));

        if (userRepository.findByEmployee_Matricule(request.getMatricule()).isPresent()) {
            throw new IllegalStateException("A user account already exists for this employee.");
        }

        var user = User.builder()
                .employee(employee)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();

        var savedUser = userRepository.save(user);
        var jwtToken = jwtService.generateToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);
        saveUserToken(savedUser, jwtToken);

        return AuthenticationResponseDto.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .user(AuthenticationResponseDto.User.builder()
                        .id(user.getId())
                        .matricule(user.getUsername())
                        .role(user.getRole()).build())
                .build();
    }

    public AuthenticationResponseDto login(LoginRequestDto request, HttpServletRequest httpRequest) {
        String ip = resolveClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getMatricule(),
                            request.getPassword()
                    )
            );
        } catch (Exception ex) {
            activityLogService.logEventByMatricule(request.getMatricule(), "LOGIN_FAILED",
                    ip, userAgent, "Tentative de connexion échouée");
            throw ex;
        }

        var user = userRepository.findByEmployee_Matricule(request.getMatricule())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        var jwtToken = jwtService.generateToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);
        revokeAllUserTokens(user);
        saveUserToken(user, jwtToken);

        activityLogService.logEvent(user.getId(), "LOGIN", ip, userAgent, "Connexion réussie");

        return AuthenticationResponseDto.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .user(AuthenticationResponseDto.User.builder()
                        .id(user.getId())
                        .matricule(user.getUsername())
                        .fullName(user.getEmployee().getFullName())
                        .role(user.getRole()).build())
                .build();
    }

    private String resolveClientIp(HttpServletRequest request) {
        return IpUtils.resolveClientIp(request);
    }

    public ValidateTokenResponseDto validateToken(
            HttpServletRequest request
    ) {
        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        final String token;
        final String matricule;
        boolean valid = false;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new BadCredentialsException("Invalid token");
        }

        token = authHeader.substring(7);
        matricule = jwtService.extractUsername(token);
        if (matricule != null) {
            var user = this.userRepository.findByEmployee_Matricule(matricule)
                    .orElseThrow(() -> new UsernameNotFoundException("user not found"));
            valid = jwtService.isTokenValid(token, user);
        }

        return ValidateTokenResponseDto.builder()
                .valid(valid)
                .build();

    }
}
