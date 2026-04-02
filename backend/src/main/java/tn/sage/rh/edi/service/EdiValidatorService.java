package tn.sage.rh.edi.service;

import org.springframework.stereotype.Service;
import tn.sage.rh.edi.dto.EdiValidationResultDto;
import tn.sage.rh.edi.exception.EdiParsingException;
import tn.sage.rh.edi.exception.EdiValidationException;
import tn.sage.rh.edi.model.*;
import tn.sage.rh.edi.util.EdiDateUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class EdiValidatorService {

    private static final Set<String> VALID_QTY_TYPES = Set.of("70", "79", "1");
    private static final Set<String> VALID_SCC_TYPES = Set.of("1", "4");

    /**
     * Validates parsed interchange and throws EdiValidationException if invalid.
     */
    public void validate(EdiInterchange interchange) {
        EdiValidationResultDto result = validateAndReport(interchange);
        if (!result.isValid()) {
            throw new EdiValidationException(result.getErrors());
        }
    }

    /**
     * Validates parsed interchange and returns a detailed result DTO.
     */
    public EdiValidationResultDto validateAndReport(EdiInterchange interchange) {
        List<String> errors = new ArrayList<>();

        if (interchange == null) {
            errors.add("Interchange is null");
            return buildResult(errors, 0);
        }

        // UNB presence checks
        if (interchange.getSenderCode() == null || interchange.getSenderCode().isBlank()) {
            errors.add("UNB: missing sender code");
        }
        if (interchange.getReceiverCode() == null || interchange.getReceiverCode().isBlank()) {
            errors.add("UNB: missing receiver code");
        }
        if (interchange.getInterchangeRef() == null || interchange.getInterchangeRef().isBlank()) {
            errors.add("UNB: missing interchange reference");
        }

        // Messages presence
        if (interchange.getMessages() == null || interchange.getMessages().isEmpty()) {
            errors.add("No DELFOR messages found (expected at least one UNH...UNT block)");
            return buildResult(errors, 0);
        }

        // UNZ message count check
        int actualCount = interchange.getMessages().size();
        if (interchange.getMessageCount() > 0 && interchange.getMessageCount() != actualCount) {
            errors.add(String.format("UNZ count mismatch: declared %d, found %d",
                    interchange.getMessageCount(), actualCount));
        }

        // Per-message validation
        for (EdiMessage msg : interchange.getMessages()) {
            String msgId = "Message " + msg.getMessageNumber();

            if (msg.getMessageNumber() == null || msg.getMessageNumber().isBlank()) {
                errors.add(msgId + ": missing message number");
            }
            if (!"DELFOR".equalsIgnoreCase(msg.getMessageType())) {
                errors.add(msgId + ": unexpected message type '" + msg.getMessageType() + "' (expected DELFOR)");
            }
            if (msg.getMessageDate() != null && !msg.getMessageDate().isBlank()
                    && !EdiDateUtil.isValidEdiDate(msg.getMessageDate())) {
                errors.add(msgId + ": invalid message date '" + msg.getMessageDate() + "'");
            }

            if (msg.getDeliveryLines() == null || msg.getDeliveryLines().isEmpty()) {
                errors.add(msgId + ": no delivery lines (LIN segments)");
                continue;
            }

            for (EdiDeliveryLine dl : msg.getDeliveryLines()) {
                String lineId = msgId + " LIN " + dl.getArticleRef();

                if (dl.getArticleRef() == null || dl.getArticleRef().isBlank()) {
                    errors.add(lineId + ": missing article reference");
                }
                if (dl.getOrderReference() == null || dl.getOrderReference().isBlank()) {
                    errors.add(lineId + ": missing order reference (RFF+ON)");
                }

                validateDate(errors, lineId, "DTM+51 (lastShipDate)", dl.getLastShipDate());
                validateDate(errors, lineId, "DTM+52 (referenceDate)", dl.getReferenceDate());

                for (EdiSccBlock scc : dl.getSccBlocks()) {
                    if (!VALID_SCC_TYPES.contains(scc.getSccType())) {
                        errors.add(lineId + ": unknown SCC type '" + scc.getSccType() + "'");
                    }
                    for (EdiScheduleEntry entry : scc.getEntries()) {
                        if (entry.getFixedDeliveryDate() != null) {
                            validateDate(errors, lineId, "DTM+2", entry.getFixedDeliveryDate());
                        }
                        if (entry.getPeriodStartDate() != null) {
                            validateDate(errors, lineId, "DTM+158", entry.getPeriodStartDate());
                        }
                        if (entry.getPeriodEndDate() != null) {
                            validateDate(errors, lineId, "DTM+159", entry.getPeriodEndDate());
                        }
                    }
                }
            }
        }

        return buildResult(errors, actualCount);
    }

    /**
     * Validates raw EDI content by parsing then running full validation.
     * Returns a result DTO suitable for the /validate endpoint.
     */
    public EdiValidationResultDto validateRaw(String content, EdiParserService parserService) {
        try {
            EdiInterchange interchange = parserService.parseEdi(content);
            return validateAndReport(interchange);
        } catch (EdiParsingException e) {
            List<String> errors = List.of("Parse error: " + e.getMessage());
            return buildResult(errors, 0);
        } catch (Exception e) {
            List<String> errors = List.of("Unexpected error: " + e.getMessage());
            return buildResult(errors, 0);
        }
    }

    private void validateDate(List<String> errors, String context, String field, String dateStr) {
        if (dateStr != null && !dateStr.isBlank() && !EdiDateUtil.isValidEdiDate(dateStr)) {
            errors.add(context + ": invalid date in " + field + " = '" + dateStr + "'");
        }
    }

    private EdiValidationResultDto buildResult(List<String> errors, int messageCount) {
        return EdiValidationResultDto.builder()
                .valid(errors.isEmpty())
                .errors(errors)
                .messageCount(messageCount)
                .build();
    }
}
