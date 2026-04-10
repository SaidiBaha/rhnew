package tn.sage.rh.edi.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.sage.rh.edi.dto.EdiConversionRequestDto;
import tn.sage.rh.edi.dto.EdiConversionResponseDto;
import tn.sage.rh.edi.dto.EdiValidationResultDto;
import tn.sage.rh.edi.exception.EdiParsingException;
import tn.sage.rh.edi.exception.EdiValidationException;
import tn.sage.rh.edi.model.EdiConversionHistory;
import tn.sage.rh.edi.model.EdiInterchange;
import tn.sage.rh.edi.service.EdiConverterService;
import tn.sage.rh.edi.service.EdiHistoryService;
import tn.sage.rh.edi.service.EdiParserService;
import tn.sage.rh.edi.service.EdiValidatorService;
import tn.sage.rh.edi.util.EdiDateUtil;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRole;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@RestController
@RequestMapping("/api/v1/edi")
@RequiredArgsConstructor
public class EdiController {

    private final EdiParserService    parserService;
    private final EdiConverterService converterService;
    private final EdiValidatorService validatorService;
    private final EdiHistoryService   historyService;

    // ── POST /api/v1/edi/convert (multipart → fichier CSV téléchargeable) ────

    @PostMapping("/convert")
    public ResponseEntity<Resource> convertEdiToCsv(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        String matricule = extractMatricule(authentication);
        String fullName  = extractFullName(authentication);

        EdiConversionHistory history = EdiConversionHistory.builder()
                .ediFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown.EDI")
                .ediFileSizeBytes(file.getSize())
                .convertedByMatricule(matricule)
                .convertedByName(fullName)
                .convertedAt(LocalDateTime.now())
                .status(EdiConversionHistory.ConversionStatus.ERROR)
                .build();

        try {
            String content = readFileContent(file);
            EdiInterchange interchange = parserService.parseEdi(content);
            validatorService.validate(interchange);
            String csv = converterService.convertToCsv(interchange);

            String filename = buildCsvFilename(interchange);
            byte[] csvBytes = csv.getBytes(StandardCharsets.UTF_8);

            history.setStatus(EdiConversionHistory.ConversionStatus.SUCCESS);
            history.setCsvFileName(filename);
            history.setCsvContent(csv);
            history.setCsvFileSizeBytes((long) csvBytes.length);
            history.setMessageCount(interchange.getMessages().size());
            history.setLineCount(countDeliveryLines(interchange));
            history.setInterchangeRef(interchange.getInterchangeRef());
            history.setSenderCode(interchange.getSenderCode());
            history.setReceiverCode(interchange.getReceiverCode());
            history.setEdiFileDate(parseUnbDate(interchange.getDate()));
            historyService.save(history);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                    .contentLength(csvBytes.length)
                    .body(new ByteArrayResource(csvBytes));

        } catch (EdiParsingException | EdiValidationException e) {
            history.setErrorMessage(e.getMessage());
            historyService.save(history);
            log.warn("EDI conversion rejected: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            history.setErrorMessage(e.getMessage());
            historyService.save(history);
            log.error("EDI conversion error", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── POST /api/v1/edi/convert/text (JSON → JSON avec csvContent) ──────────

    @PostMapping("/convert/text")
    public ResponseEntity<EdiConversionResponseDto> convertEdiText(
            @RequestBody EdiConversionRequestDto request,
            Authentication authentication) {

        String matricule = extractMatricule(authentication);
        String fullName  = extractFullName(authentication);
        String fileName  = request.getFileName() != null ? request.getFileName() : "text-input.EDI";

        EdiConversionHistory history = EdiConversionHistory.builder()
                .ediFileName(fileName)
                .ediFileSizeBytes(request.getEdiContent() != null
                        ? (long) request.getEdiContent().getBytes(StandardCharsets.UTF_8).length : 0L)
                .convertedByMatricule(matricule)
                .convertedByName(fullName)
                .convertedAt(LocalDateTime.now())
                .status(EdiConversionHistory.ConversionStatus.ERROR)
                .build();

        try {
            EdiInterchange interchange = parserService.parseEdi(request.getEdiContent());
            validatorService.validate(interchange);
            String csv = converterService.convertToCsv(interchange);

            String filename   = buildCsvFilename(interchange);
            byte[] csvBytes   = csv.getBytes(StandardCharsets.UTF_8);
            int    lineCount  = countDeliveryLines(interchange);
            int    schedCount = countScheduleEntries(interchange);

            history.setStatus(EdiConversionHistory.ConversionStatus.SUCCESS);
            history.setCsvFileName(filename);
            history.setCsvContent(csv);
            history.setCsvFileSizeBytes((long) csvBytes.length);
            history.setMessageCount(interchange.getMessages().size());
            history.setLineCount(lineCount);
            history.setInterchangeRef(interchange.getInterchangeRef());
            history.setSenderCode(interchange.getSenderCode());
            history.setReceiverCode(interchange.getReceiverCode());
            history.setEdiFileDate(parseUnbDate(interchange.getDate()));
            historyService.save(history);

            return ResponseEntity.ok(EdiConversionResponseDto.builder()
                    .csvContent(csv)
                    .suggestedFilename(filename)
                    .messageCount(interchange.getMessages().size())
                    .deliveryLineCount(lineCount)
                    .totalScheduleEntries(schedCount)
                    .csvSizeBytes(csvBytes.length)
                    .build());

        } catch (EdiParsingException e) {
            history.setErrorMessage(e.getMessage());
            historyService.save(history);
            log.warn("EDI text parse error: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (EdiValidationException e) {
            history.setErrorMessage(e.getMessage());
            historyService.save(history);
            log.warn("EDI text validation error: {}", e.getMessage());
            return ResponseEntity.unprocessableEntity().build();
        } catch (Exception e) {
            history.setErrorMessage(e.getMessage());
            historyService.save(history);
            log.error("EDI text conversion error", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── POST /api/v1/edi/validate ─────────────────────────────────────────────

    @PostMapping("/validate")
    public ResponseEntity<EdiValidationResultDto> validateEdi(@RequestParam("file") MultipartFile file) {
        try {
            String content = readFileContent(file);
            EdiValidationResultDto result = validatorService.validateRaw(content, parserService);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("EDI validation error", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── GET /api/v1/edi/history ───────────────────────────────────────────────

    @GetMapping("/history")
    public ResponseEntity<Page<EdiConversionHistory>> getHistory(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        String   matricule = extractMatricule(authentication);
        UserRole role      = extractRole(authentication);
        return ResponseEntity.ok(
                historyService.getHistory(matricule, role, PageRequest.of(page, size)));
    }

    // ── GET /api/v1/edi/history/{id}/download ────────────────────────────────

    @GetMapping("/history/{id}/download")
    public ResponseEntity<Resource> downloadFromHistory(
            @PathVariable Long id,
            Authentication authentication) {

        String   matricule = extractMatricule(authentication);
        UserRole role      = extractRole(authentication);

        try {
            EdiConversionHistory entry = historyService.getForDownload(id, matricule, role);

            if (entry.getCsvContent() == null) {
                return ResponseEntity.status(HttpStatus.GONE).build();
            }

            byte[] csvBytes = entry.getCsvContent().getBytes(StandardCharsets.UTF_8);
            String filename = entry.getCsvFileName() != null ? entry.getCsvFileName() : "export.csv";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                    .contentLength(csvBytes.length)
                    .body(new ByteArrayResource(csvBytes));

        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (EdiParsingException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── GET /api/v1/edi/health ────────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("EDI module OK");
    }

    // ── Helpers privés ────────────────────────────────────────────────────────

    private String readFileContent(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        String utf8 = new String(bytes, StandardCharsets.UTF_8);
        if (!utf8.contains("\uFFFD")) return utf8;
        return new String(bytes, Charset.forName("ISO-8859-1"));
    }

    private String buildCsvFilename(EdiInterchange interchange) {
        String fullDate = EdiDateUtil.expandUnbDate(interchange.getDate());
        if (fullDate == null) fullDate = "00000000";
        LocalTime now = LocalTime.now();
        String timeStr = String.format("%02d%02d%02d", now.getHour(), now.getMinute(), now.getSecond());
        return "DELFOR___" + fullDate + "_" + timeStr + ".csv";
    }

    private LocalDate parseUnbDate(String yymmdd) {
        String full = EdiDateUtil.expandUnbDate(yymmdd);
        if (full == null) return null;
        try {
            return LocalDate.parse(full, DateTimeFormatter.ofPattern("yyyyMMdd"));
        } catch (Exception e) {
            return null;
        }
    }

    private String extractMatricule(Authentication auth) {
        return auth.getName();
    }

    private String extractFullName(Authentication auth) {
        if (auth.getPrincipal() instanceof User user) {
            return user.getEmployee().getFullName();
        }
        return auth.getName();
    }

    private UserRole extractRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.replace("ROLE_", ""))
                .map(UserRole::valueOf)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Rôle introuvable dans le token"));
    }

    private int countDeliveryLines(EdiInterchange interchange) {
        return interchange.getMessages().stream()
                .mapToInt(m -> m.getDeliveryLines().size())
                .sum();
    }

    private int countScheduleEntries(EdiInterchange interchange) {
        return interchange.getMessages().stream()
                .flatMap(m -> m.getDeliveryLines().stream())
                .flatMap(dl -> dl.getSccBlocks().stream())
                .mapToInt(scc -> scc.getEntries().size())
                .sum();
    }
}
