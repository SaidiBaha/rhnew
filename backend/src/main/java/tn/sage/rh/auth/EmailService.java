package tn.sage.rh.auth;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendOtpEmail(String to, String otpCode) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "SAGE TUNISIA – Sage RH");
            helper.setTo(to);
            helper.setSubject("Réinitialisation de votre mot de passe – SAGE TUNISIA");
            helper.setText(buildEmailTemplate(otpCode), true);
            mailSender.send(message);
            log.info("Email OTP envoyé à {}", to);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Erreur envoi email OTP à {} : {}", to, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email de réinitialisation", e);
        }
    }

    private String buildEmailTemplate(String otpCode) {
        return """
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Réinitialisation mot de passe</title>
                </head>
                <body style="margin:0;padding:0;background-color:#f4f6fb;font-family:Arial,Helvetica,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb;padding:40px 20px;">
                    <tr>
                      <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0"
                               style="background:#ffffff;border-radius:12px;overflow:hidden;
                                      box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">

                          <!-- HEADER -->
                          <tr>
                            <td style="background:#1b2444;padding:28px 40px;">
                              <table width="100%%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td>
                                    <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:1px;">
                                      SAGE TUNISIA
                                    </div>
                                    <div style="font-size:10px;color:#9aa3b8;letter-spacing:3px;
                                                text-transform:uppercase;margin-top:4px;">
                                      Cutting and Sewing Division
                                    </div>
                                  </td>
                                  <td align="right">
                                    <table cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td width="44" height="44"
                                            style="background:#2f6bff;border-radius:10px;
                                                   text-align:center;vertical-align:middle;">
                                          <span style="color:#fff;font-size:22px;font-weight:900;
                                                       line-height:44px;">S</span>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- BODY -->
                          <tr>
                            <td style="padding:40px 40px 28px 40px;">
                              <h1 style="font-size:22px;font-weight:700;color:#1a2340;
                                         margin:0 0 12px 0;line-height:1.3;">
                                Réinitialisation de votre mot de passe
                              </h1>
                              <p style="font-size:14px;color:#4b5675;line-height:1.7;margin:0 0 28px 0;">
                                Bonjour,<br><br>
                                Vous avez demandé à réinitialiser votre mot de passe sur la plateforme
                                <strong>Sage RH</strong>.<br>
                                Utilisez le code ci-dessous pour continuer :
                              </p>

                              <!-- OTP BLOCK -->
                              <table width="100%%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td align="center" style="padding:8px 0 32px 0;">
                                    <table cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td style="background:#eef3ff;border:2px solid #2f6bff;
                                                   border-radius:12px;padding:20px 52px;
                                                   text-align:center;">
                                          <div style="font-size:11px;font-weight:700;letter-spacing:3px;
                                                      text-transform:uppercase;color:#2f6bff;
                                                      margin-bottom:10px;">
                                            Code de vérification
                                          </div>
                                          <div style="font-size:42px;font-weight:900;
                                                      letter-spacing:14px;color:#1a2340;
                                                      font-family:Courier New,monospace;">
                """ + otpCode + """
                                          </div>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>

                              <!-- INFO BOXES -->
                              <table width="100%%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="background:#fff8e6;border-left:4px solid #ff8c00;
                                             padding:14px 18px;border-radius:0 6px 6px 0;">
                                    <p style="margin:0;font-size:13px;color:#4b5675;">
                                      &#9201; Ce code est <strong>valable pendant 15 minutes</strong>
                                      à compter de la réception de cet email.
                                    </p>
                                  </td>
                                </tr>
                                <tr><td height="12"></td></tr>
                                <tr>
                                  <td style="background:#fff0f0;border-left:4px solid #f03e3e;
                                             padding:14px 18px;border-radius:0 6px 6px 0;">
                                    <p style="margin:0;font-size:13px;color:#4b5675;">
                                      &#128274; Si vous n'êtes pas à l'origine de cette demande,
                                      <strong>ignorez cet email</strong>.
                                      Votre mot de passe ne sera pas modifié.
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- DIVIDER -->
                          <tr>
                            <td style="padding:0 40px;">
                              <div style="border-top:1px solid #e4e8f0;"></div>
                            </td>
                          </tr>

                          <!-- FOOTER -->
                          <tr>
                            <td style="padding:24px 40px 32px 40px;">
                              <table width="100%%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td>
                                    <div style="font-size:13px;font-weight:700;color:#1a2340;">
                                      SAGE TUNISIA SARL
                                    </div>
                                    <div style="font-size:12px;color:#9aa3b8;margin-top:8px;line-height:2;">
                                      Cut &amp; Sew division<br>
                                      Mobile&nbsp;: +216 27.501.097<br>
                                      Email&nbsp;: b.saidi@sagetunisia.com<br>
                                      LOT N&#176;25, Z.I El Agba, 2087 TUNISIA
                                    </div>
                                  </td>
                                  <td align="right" valign="bottom">
                                    <div style="font-size:11px;color:#c0c8d8;">
                                      Sage RH Automotive
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """;
    }
}
