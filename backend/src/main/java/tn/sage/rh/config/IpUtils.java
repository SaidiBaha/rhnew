package tn.sage.rh.config;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class IpUtils {

    private static final Logger log = LoggerFactory.getLogger(IpUtils.class);

    private IpUtils() {}

    /**
     * Résout l'IP réelle du client en tenant compte des headers proxy.
     * Ordre de priorité : X-Forwarded-For → X-Real-IP → Forwarded → remoteAddr.
     *
     * NOTE : si l'IP affichée est toujours "::1" (IPv6 loopback), cela signifie que
     * le navigateur se connecte via "localhost" (même machine). Changer VITE_API_BASE_URL
     * pour utiliser l'IP réelle de la machine résout ce problème en développement.
     * En production derrière un proxy, configurer server.forward-headers-strategy=NATIVE
     * et s'assurer que le proxy transmet X-Forwarded-For.
     */
    public static String resolveClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (isValid(ip)) {
            return normalize(ip.split(",")[0].trim());
        }

        ip = request.getHeader("X-Real-IP");
        if (isValid(ip)) {
            return normalize(ip.trim());
        }

        ip = request.getHeader("Forwarded");
        if (ip != null && !ip.isBlank()) {
            for (String part : ip.split(";")) {
                String trimmed = part.trim();
                if (trimmed.toLowerCase().startsWith("for=")) {
                    String forValue = trimmed.substring(4).trim()
                            .replaceAll("[\"\\[\\]]", "");
                    if (isValid(forValue)) {
                        return normalize(forValue);
                    }
                }
            }
        }

        String remoteAddr = request.getRemoteAddr();
        log.debug("IP resolved from remoteAddr: {} (aucun header proxy présent) — URI: {}",
                remoteAddr, request.getRequestURI());
        return normalize(remoteAddr);
    }

    /**
     * Convertit une adresse IPv4-mappée IPv6 (::ffff:x.x.x.x) en IPv4 simple.
     */
    private static String normalize(String ip) {
        if (ip != null && ip.startsWith("::ffff:")) {
            return ip.substring(7);
        }
        return ip;
    }

    private static boolean isValid(String ip) {
        return ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip);
    }
}
