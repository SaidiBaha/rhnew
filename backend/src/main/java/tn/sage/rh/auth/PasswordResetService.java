package tn.sage.rh.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.auth.dto.MessageResponse;
import tn.sage.rh.auth.dto.VerifyOtpResponse;
import tn.sage.rh.exeption.ErrorCodes;
import tn.sage.rh.exeption.InvalidOperationException;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetOtpRepository otpRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    // ─── 1. Envoi OTP ─────────────────────────────────────────────
    @Transactional
    public MessageResponse forgotPassword(String email) {
        userRepository.findByEmployee_Email(email).ifPresent(user -> {
            // Supprimer les anciens OTP de cet utilisateur
            otpRepository.deleteByUser(user);

            // Générer un code OTP à 6 chiffres (SecureRandom pour la sécurité)
            String otpCode = String.format("%06d", new SecureRandom().nextInt(1_000_000));

            PasswordResetOtp otp = PasswordResetOtp.builder()
                    .user(user)
                    .otpCode(otpCode)
                    .expiresAt(LocalDateTime.now().plusMinutes(15))
                    .build();
            otpRepository.save(otp);

            try {
                emailService.sendOtpEmail(email, otpCode);
            } catch (Exception e) {
                log.error("Échec envoi OTP à {} : {}", email, e.getMessage());
                // Ne pas remonter l'erreur pour ne pas révéler l'existence de l'email
            }
        });

        // Toujours renvoyer le même message (sécurité : ne pas révéler si l'email existe)
        return new MessageResponse("Si cet email est enregistré, un code de vérification a été envoyé.");
    }

    // ─── 2. Vérification OTP ──────────────────────────────────────
    @Transactional
    public VerifyOtpResponse verifyOtp(String email, String otp) {
        PasswordResetOtp otpEntity = otpRepository
                .findTopByUser_Employee_EmailAndOtpCodeAndUsedFalseOrderByCreatedAtDesc(email, otp)
                .orElseThrow(() -> new InvalidOperationException(
                        "Code OTP invalide ou expiré.", ErrorCodes.INVALID_INPUT));

        if (otpEntity.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidOperationException("Code OTP expiré.", ErrorCodes.INVALID_INPUT);
        }

        // Générer un resetToken temporaire valide 10 minutes
        String resetToken = UUID.randomUUID().toString();
        otpEntity.setResetToken(resetToken);
        otpEntity.setResetTokenExpiresAt(LocalDateTime.now().plusMinutes(10));
        otpRepository.save(otpEntity);

        return VerifyOtpResponse.builder().resetToken(resetToken).build();
    }

    // ─── 3. Réinitialisation mot de passe ─────────────────────────
    @Transactional
    public MessageResponse resetPassword(String resetToken, String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new InvalidOperationException(
                    "Les mots de passe ne correspondent pas.", ErrorCodes.INVALID_INPUT);
        }

        PasswordResetOtp otpEntity = otpRepository
                .findByResetTokenAndUsedFalse(resetToken)
                .orElseThrow(() -> new InvalidOperationException(
                        "Token de réinitialisation invalide.", ErrorCodes.INVALID_INPUT));

        if (otpEntity.getResetTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidOperationException(
                    "Token de réinitialisation expiré.", ErrorCodes.INVALID_INPUT);
        }

        User user = otpEntity.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Invalider l'OTP après utilisation
        otpEntity.setUsed(true);
        otpRepository.save(otpEntity);

        return new MessageResponse("Mot de passe réinitialisé avec succès.");
    }
}
