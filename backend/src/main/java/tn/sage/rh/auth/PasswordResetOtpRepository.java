package tn.sage.rh.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.user.User;

import java.util.Optional;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {

    Optional<PasswordResetOtp> findTopByUser_Employee_EmailAndOtpCodeAndUsedFalseOrderByCreatedAtDesc(
            String email, String otpCode);

    Optional<PasswordResetOtp> findByResetTokenAndUsedFalse(String resetToken);

    void deleteByUser(User user);
}
