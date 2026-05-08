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

    public void sendSalaryAdvanceImportEmail(String to, String supervisorName, String dateStr) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "SAGE TUNISIA – Sage RH");
            helper.setTo(to);
            helper.setSubject("Saisie des avances requise – Pointage du " + dateStr);
            helper.setText(buildAdvanceImportEmailTemplate(supervisorName, dateStr), true);
            mailSender.send(message);
            log.info("Email import avances envoyé à {}", to);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Erreur envoi email import avances à {} : {}", to, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email de notification avances", e);
        }
    }

    public void sendSalaryAdvanceReminderEmail(String to, String supervisorName, String dateStr) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "SAGE TUNISIA – Sage RH");
            helper.setTo(to);
            helper.setSubject("Rappel — Avances non complétées – Pointage du " + dateStr);
            helper.setText(buildAdvanceReminderEmailTemplate(supervisorName, dateStr), true);
            mailSender.send(message);
            log.info("Email rappel avances envoyé à {}", to);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Erreur envoi email rappel avances à {} : {}", to, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email de rappel avances", e);
        }
    }

    private String buildAdvanceImportEmailTemplate(String supervisorName, String dateStr) {
        return buildAdvanceEmailTemplate(
                supervisorName,
                "Saisie des avances requise",
                "Le fichier de pointage du <strong>" + dateStr + "</strong> vient d'être importé.",
                "Veuillez vous connecter à la plateforme <strong>Sage RH</strong> et saisir "
                + "les avances sur salaire de votre équipe dans le module <em>Avances sur salaire</em>.",
                "#2f6bff", "&#128203;"
        );
    }

    private String buildAdvanceReminderEmailTemplate(String supervisorName, String dateStr) {
        return buildAdvanceEmailTemplate(
                supervisorName,
                "Rappel — Avances non complétées",
                "Vous n'avez pas encore saisi les avances de votre équipe "
                + "pour le pointage du <strong>" + dateStr + "</strong>.",
                "Merci de vous connecter à la plateforme <strong>Sage RH</strong> et de compléter "
                + "la saisie des avances sur salaire dans le module <em>Avances sur salaire</em> dès que possible.",
                "#ff8c00", "&#9201;"
        );
    }

    private String buildAdvanceEmailTemplate(String supervisorName, String title,
                                              String intro, String action,
                                              String accentColor, String icon) {
        return """
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background-color:#f4f6fb;font-family:Arial,Helvetica,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb;padding:40px 20px;">
                    <tr>
                      <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0"
                               style="background:#ffffff;border-radius:12px;overflow:hidden;
                                      box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">
                          <tr>
                            <td style="background:#1b2444;padding:28px 40px;">
                              <table width="100%%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td>
                                    <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:1px;">SAGE TUNISIA</div>
                                    <div style="font-size:10px;color:#9aa3b8;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Cutting and Sewing Division</div>
                                  </td>
                                  <td align="right">
                                    <table cellpadding="0" cellspacing="0"><tr>
                                      <td width="44" height="44" style="background:%s;border-radius:10px;text-align:center;vertical-align:middle;">
                                        <span style="color:#fff;font-size:22px;font-weight:900;line-height:44px;">S</span>
                                      </td>
                                    </tr></table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:40px 40px 28px 40px;">
                              <h1 style="font-size:22px;font-weight:700;color:#1a2340;margin:0 0 12px 0;line-height:1.3;">
                                %s %s
                              </h1>
                              <p style="font-size:14px;color:#4b5675;line-height:1.7;margin:0 0 20px 0;">
                                Bonjour <strong>%s</strong>,<br><br>%s
                              </p>
                              <table width="100%%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="background:#eef3ff;border-left:4px solid %s;padding:14px 18px;border-radius:0 6px 6px 0;">
                                    <p style="margin:0;font-size:13px;color:#4b5675;">%s</p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e4e8f0;"></div></td></tr>
                          <tr>
                            <td style="padding:24px 40px 32px 40px;">
                              <div style="font-size:13px;font-weight:700;color:#1a2340;">SAGE TUNISIA SARL</div>
                              <div style="font-size:12px;color:#9aa3b8;margin-top:8px;line-height:2;">
                                Cut &amp; Sew division<br>
                                Mobile&nbsp;: +216 27.501.097<br>
                                Email&nbsp;: b.saidi@sagetunisia.com<br>
                                LOT N&#176;25, Z.I El Agba, 2087 TUNISIA
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(title, accentColor, icon, title, supervisorName, intro, accentColor, action);
    }

    public void sendAuditAssignmentEmail(String to, String employeeName, String auditTitle,
                                          String dateStr, String lineZone) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "SAGE TUNISIA – Sage RH");
            helper.setTo(to);
            helper.setSubject("Nouvel audit HSE assigné – " + dateStr);
            helper.setText(buildAuditEmailTemplate(
                    employeeName,
                    "Nouvel audit HSE assigné",
                    "Vous avez été désigné(e) auditeur(rice) pour un audit HSE.",
                    "Titre : <strong>" + auditTitle + "</strong><br>"
                    + "Date et heure : <strong>" + dateStr + "</strong><br>"
                    + "Ligne / Zone : <strong>" + lineZone + "</strong><br><br>"
                    + "Veuillez vous connecter à la plateforme <strong>Sage RH</strong> et accéder à la section "
                    + "<em>Mes Audits</em> pour consulter les détails.",
                    "#2f6bff", "&#128203;"
            ), true);
            mailSender.send(message);
            log.info("Email affectation audit envoyé à {}", to);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Erreur envoi email affectation audit à {} : {}", to, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email d'affectation audit", e);
        }
    }

    public void sendAuditReminderEmail(String to, String name, String auditTitle,
                                        String dateStr, String lineZone, String type) {
        boolean is24h = "24H".equals(type);
        String subject = is24h
                ? "Rappel : Audit HSE dans 24h – " + dateStr
                : "Rappel : Audit HSE aujourd'hui – " + dateStr;
        String intro = is24h
                ? "Votre audit HSE aura lieu dans 24 heures."
                : "Votre audit HSE est prévu aujourd'hui.";
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "SAGE TUNISIA – Sage RH");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(buildAuditEmailTemplate(
                    name,
                    is24h ? "Rappel : Audit HSE dans 24h" : "Rappel : Audit HSE aujourd'hui",
                    intro,
                    "Titre : <strong>" + auditTitle + "</strong><br>"
                    + "Date et heure : <strong>" + dateStr + "</strong><br>"
                    + "Ligne / Zone : <strong>" + lineZone + "</strong>",
                    "#ff8c00", "&#9201;"
            ), true);
            mailSender.send(message);
            log.info("Email rappel audit {} envoyé à {}", type, to);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Erreur envoi email rappel audit {} à {} : {}", type, to, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email de rappel audit", e);
        }
    }

    public void sendAuditStatusChangeEmail(String to, String name, String message, String event) {
        boolean isStarted = "EN_COURS".equals(event);
        String subject = isStarted ? "Remplissage d'audit commencé" : "Audit terminé et validé";
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, "SAGE TUNISIA – Sage RH");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(buildAuditEmailTemplate(
                    name, subject, message, "",
                    isStarted ? "#00c48c" : "#2f6bff",
                    isStarted ? "&#9997;" : "&#10003;"
            ), true);
            mailSender.send(msg);
            log.info("Email statut audit {} envoyé à {}", event, to);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Erreur envoi email statut audit {} à {} : {}", event, to, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email statut audit", e);
        }
    }

    private String buildAuditEmailTemplate(String recipientName, String title, String intro,
                                             String details, String accentColor, String icon) {
        return buildAdvanceEmailTemplate(recipientName, title, intro, details, accentColor, icon);
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
