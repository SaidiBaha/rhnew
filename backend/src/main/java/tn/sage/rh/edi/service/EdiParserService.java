package tn.sage.rh.edi.service;

import org.springframework.stereotype.Service;
import tn.sage.rh.edi.exception.EdiParsingException;
import tn.sage.rh.edi.model.*;

import java.util.ArrayList;

/**
 * Parses raw EDIFACT DELFOR content into an EdiInterchange object.
 * Supports EDIFACT D:97A:UN with standard separators: ' + :
 * Release character '?' is handled for escaped segment terminators.
 */
@Service
public class EdiParserService {

    public EdiInterchange parseEdi(String content) {
        if (content == null || content.isBlank()) {
            throw new EdiParsingException("EDI content is empty");
        }

        // Normalize line endings
        String normalized = content.replace("\r\n", "\n").replace("\r", "\n");

        // Split into segments on ' (apostrophe) not preceded by ? (release char)
        String[] rawSegments = normalized.split("(?<!\\?)'");

        EdiInterchange interchange = new EdiInterchange();

        EdiMessage currentMessage = null;
        EdiDeliveryLine currentLine = null;
        EdiSccBlock currentScc = null;

        for (String raw : rawSegments) {
            String seg = raw.trim();
            if (seg.isEmpty()) continue;

            // Split by + (element separator), not preceded by ?
            String[] elements = seg.split("(?<!\\?)\\+", -1);
            if (elements.length == 0) continue;

            String tag = elements[0].trim();

            switch (tag) {
                case "UNB" -> parseUNB(interchange, elements);

                case "UNH" -> {
                    currentMessage = parseUNH(elements);
                    currentLine = null;
                    currentScc = null;
                }

                case "BGM" -> {
                    if (currentMessage != null) parseBGM(currentMessage, elements);
                }

                case "DTM" -> {
                    if (currentMessage != null) {
                        parseDTM(currentMessage, currentLine, currentScc, elements);
                    }
                }

                case "NAD" -> {
                    if (currentMessage != null) parseNAD(currentMessage, elements);
                }

                case "GIS" -> {
                    if (currentMessage != null && elements.length > 1) {
                        currentMessage.setGisFlag(elements[1].trim());
                    }
                }

                case "LIN" -> {
                    // Finalize current delivery line before starting a new one
                    if (currentLine != null) {
                        if (currentScc != null) {
                            currentLine.getSccBlocks().add(currentScc);
                            currentScc = null;
                        }
                        currentMessage.getDeliveryLines().add(currentLine);
                    }
                    currentLine = parseLIN(elements);
                    currentScc = null;
                }

                case "LOC" -> {
                    if (currentLine != null && elements.length > 2
                            && "11".equals(elements[1].trim())) {
                        currentLine.setDeliveryLocation(elements[2].trim());
                    }
                }

                case "RFF" -> {
                    if (currentLine != null && elements.length > 1) {
                        String[] rffComps = elements[1].split(":", -1);
                        if (rffComps.length >= 2 && "ON".equals(rffComps[0].trim())) {
                            currentLine.setOrderReference(rffComps[1].trim());
                        }
                    }
                }

                case "QTY" -> {
                    if (currentLine != null && elements.length > 1) {
                        String[] qtyComps = elements[1].split(":", -1);
                        if (qtyComps.length >= 2) {
                            String qtyType = qtyComps[0].trim();
                            String qtyValue = qtyComps[1].trim();
                            switch (qtyType) {
                                case "70" -> currentLine.setCumulativeQty(qtyValue);
                                case "79" -> currentLine.setTotalScheduleQty(qtyValue);
                                case "1" -> {
                                    if (currentScc != null) {
                                        EdiScheduleEntry entry = new EdiScheduleEntry();
                                        entry.setQty(qtyValue);
                                        currentScc.getEntries().add(entry);
                                    }
                                }
                            }
                        }
                    }
                }

                case "SCC" -> {
                    // Finalize current SCC block and start a new one
                    if (currentScc != null && currentLine != null) {
                        currentLine.getSccBlocks().add(currentScc);
                    }
                    currentScc = parseSCC(elements);
                }

                case "UNT" -> {
                    // Finalize current delivery line
                    if (currentLine != null) {
                        if (currentScc != null) {
                            currentLine.getSccBlocks().add(currentScc);
                            currentScc = null;
                        }
                        currentMessage.getDeliveryLines().add(currentLine);
                        currentLine = null;
                    }
                    if (elements.length > 1) {
                        try {
                            currentMessage.setSegmentCount(Integer.parseInt(elements[1].trim()));
                        } catch (NumberFormatException ignored) {}
                    }
                    if (currentMessage != null) {
                        interchange.getMessages().add(currentMessage);
                        currentMessage = null;
                    }
                }

                case "UNZ" -> {
                    if (elements.length > 1) {
                        try {
                            interchange.setMessageCount(Integer.parseInt(elements[1].trim()));
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }

        if (interchange.getMessages().isEmpty()) {
            throw new EdiParsingException("No valid DELFOR messages found in EDI content");
        }

        return interchange;
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private void parseUNB(EdiInterchange interchange, String[] elements) {
        // UNB+UNOA:1+S4PCLNT010+389091+260318:1238+15++LAB
        if (elements.length > 1) {
            String[] syntaxComps = elements[1].split(":", -1);
            interchange.setSyntaxId(syntaxComps[0].trim());
            if (syntaxComps.length > 1) interchange.setSyntaxVersion(syntaxComps[1].trim());
        }
        if (elements.length > 2) interchange.setSenderCode(elements[2].trim());
        if (elements.length > 3) interchange.setReceiverCode(elements[3].trim());
        if (elements.length > 4) {
            String[] dateTime = elements[4].split(":", -1);
            interchange.setDate(dateTime[0].trim());
            if (dateTime.length > 1) interchange.setTime(dateTime[1].trim());
        }
        if (elements.length > 5) interchange.setInterchangeRef(elements[5].trim());
        if (elements.length > 6) interchange.setApplicationRef(elements[6].trim());
        if (elements.length > 7) interchange.setTrailingField(elements[7].trim());
    }

    private EdiMessage parseUNH(String[] elements) {
        // UNH+1+DELFOR:D:97A:UN
        EdiMessage msg = new EdiMessage();
        msg.setDeliveryLines(new ArrayList<>());
        if (elements.length > 1) msg.setMessageNumber(elements[1].trim());
        if (elements.length > 2) {
            String[] typeComps = elements[2].split(":", -1);
            if (typeComps.length > 0) msg.setMessageType(typeComps[0].trim());
            if (typeComps.length > 1) msg.setVersion(typeComps[1].trim());
            if (typeComps.length > 2) msg.setRelease(typeComps[2].trim());
            if (typeComps.length > 3) msg.setOrganization(typeComps[3].trim());
        }
        return msg;
    }

    private void parseBGM(EdiMessage msg, String[] elements) {
        // BGM+241:::PS+15+5
        if (elements.length > 1) {
            String[] bgmComps = elements[1].split(":", -1);
            msg.setBgmDocType(bgmComps.length > 0 ? bgmComps[0].trim() : "");
            msg.setBgmQual1(bgmComps.length > 1 ? bgmComps[1].trim() : "");
            msg.setBgmQual2(bgmComps.length > 2 ? bgmComps[2].trim() : "");
            msg.setBgmQual3(bgmComps.length > 3 ? bgmComps[3].trim() : "");
        }
        if (elements.length > 2) msg.setBgmDocRef(elements[2].trim());
        if (elements.length > 3) msg.setBgmFunction(elements[3].trim());
    }

    private void parseDTM(EdiMessage msg, EdiDeliveryLine line, EdiSccBlock scc, String[] elements) {
        // DTM+{qualifier}:{date}:{format}
        if (elements.length < 2) return;
        String[] dtmComps = elements[1].split(":", -1);
        if (dtmComps.length < 2) return;
        String qualifier = dtmComps[0].trim();
        String dateValue = dtmComps[1].trim();

        switch (qualifier) {
            case "137" -> { if (msg != null) msg.setMessageDate(dateValue); }
            case "51"  -> { if (line != null) line.setLastShipDate(dateValue); }
            case "52"  -> { if (line != null) line.setReferenceDate(dateValue); }
            case "2"   -> {
                if (scc != null && !scc.getEntries().isEmpty()) {
                    lastEntry(scc).setFixedDeliveryDate(dateValue);
                }
            }
            case "158" -> {
                if (scc != null && !scc.getEntries().isEmpty()) {
                    lastEntry(scc).setPeriodStartDate(dateValue);
                }
            }
            case "159" -> {
                if (scc != null && !scc.getEntries().isEmpty()) {
                    lastEntry(scc).setPeriodEndDate(dateValue);
                }
            }
        }
    }

    private void parseNAD(EdiMessage msg, String[] elements) {
        // NAD+SU+389091::92  or  NAD+ST+2047::92++MAGNA AUTOMOTIVE...
        if (elements.length < 3) return;
        String qualifier = elements[1].trim();
        String[] codeComps = elements[2].split(":", -1);
        String code = codeComps[0].trim();
        String codeQual = codeComps.length > 2 ? codeComps[2].trim() : "92";

        switch (qualifier) {
            case "SU" -> {
                msg.setSupplierCode(code);
                msg.setSupplierCodeQual(codeQual);
            }
            case "ST" -> {
                msg.setShipToCode(code);
                msg.setShipToCodeQual(codeQual);
                if (elements.length > 4) msg.setShipToName(elements[4].trim());
            }
        }
    }

    private EdiDeliveryLine parseLIN(String[] elements) {
        // LIN+++11235296J304:IN
        EdiDeliveryLine line = new EdiDeliveryLine();
        line.setSccBlocks(new ArrayList<>());
        if (elements.length > 3) {
            String[] articleComps = elements[3].split(":", -1);
            line.setArticleRef(articleComps[0].trim());
            if (articleComps.length > 1) line.setArticleQualifier(articleComps[1].trim());
        }
        return line;
    }

    private EdiSccBlock parseSCC(String[] elements) {
        // SCC+1++F:21  or  SCC+4++W:10
        EdiSccBlock scc = new EdiSccBlock();
        scc.setEntries(new ArrayList<>());
        if (elements.length > 1) scc.setSccType(elements[1].trim());
        if (elements.length > 3) {
            String[] horizonComps = elements[3].split(":", -1);
            scc.setHorizonType(horizonComps[0].trim());
            if (horizonComps.length > 1) scc.setPeriodValue(horizonComps[1].trim());
        }
        return scc;
    }

    private EdiScheduleEntry lastEntry(EdiSccBlock scc) {
        return scc.getEntries().get(scc.getEntries().size() - 1);
    }
}
