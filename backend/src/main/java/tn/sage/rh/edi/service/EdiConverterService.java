package tn.sage.rh.edi.service;

import org.springframework.stereotype.Service;
import tn.sage.rh.edi.model.*;

import java.util.List;

/**
 * Converts a parsed EdiInterchange into a CSV string.
 *
 * Mapping rules:
 *  - EDIFACT element separator '+' → CSV separator ';'
 *  - EDIFACT component separator ':' → CSV separator ';'
 *  - Each CSV line ends with ';'
 *  - LIN prefix is repeated on every delivery sub-line
 *  - SCC transition embedded at end of last QTY+1 line of preceding SCC block
 */
@Service
public class EdiConverterService {

    private static final String S = ";";
    private static final String NL = "\n";

    public String convertToCsv(EdiInterchange interchange) {
        StringBuilder sb = new StringBuilder();

        appendUnb(sb, interchange);

        for (EdiMessage msg : interchange.getMessages()) {
            appendMessageHeader(sb, msg);
            for (EdiDeliveryLine line : msg.getDeliveryLines()) {
                appendDeliveryLines(sb, line);
            }
            appendUnt(sb, msg);
        }

        appendUnz(sb, interchange);
        return sb.toString();
    }

    // ── UNB ──────────────────────────────────────────────────────────────────

    private void appendUnb(StringBuilder sb, EdiInterchange i) {
        // UNB;UNOA;1;S4PCLNT010;389091;260318;1238;15;;LAB;
        sb.append("UNB").append(S)
          .append(safe(i.getSyntaxId())).append(S)
          .append(safe(i.getSyntaxVersion())).append(S)
          .append(safe(i.getSenderCode())).append(S)
          .append(safe(i.getReceiverCode())).append(S)
          .append(safe(i.getDate())).append(S)
          .append(safe(i.getTime())).append(S)
          .append(safe(i.getInterchangeRef())).append(S)
          .append(safe(i.getApplicationRef())).append(S)
          .append(safe(i.getTrailingField())).append(S)
          .append(NL);
    }

    // ── UNH header line (UNH + BGM + DTM+137 + NAD+SU + GIS + NAD+ST) ───────

    private void appendMessageHeader(StringBuilder sb, EdiMessage msg) {
        // UNH;1;DELFOR;D;97A;UN;
        sb.append("UNH").append(S)
          .append(safe(msg.getMessageNumber())).append(S)
          .append(safe(msg.getMessageType())).append(S)
          .append(safe(msg.getVersion())).append(S)
          .append(safe(msg.getRelease())).append(S)
          .append(safe(msg.getOrganization())).append(S);

        // BGM;241;;;PS;15;5;  ← "241:::PS" flattened
        sb.append("BGM").append(S)
          .append(safe(msg.getBgmDocType())).append(S)
          .append(safe(msg.getBgmQual1())).append(S)
          .append(safe(msg.getBgmQual2())).append(S)
          .append(safe(msg.getBgmQual3())).append(S)
          .append(safe(msg.getBgmDocRef())).append(S)
          .append(safe(msg.getBgmFunction())).append(S);

        // DTM;137;20260318;102;
        sb.append("DTM").append(S).append("137").append(S)
          .append(safe(msg.getMessageDate())).append(S)
          .append("102").append(S);

        // NAD;SU;389091;;92;  ← "389091::92" flattened → code + empty + qualifier
        sb.append("NAD").append(S).append("SU").append(S)
          .append(safe(msg.getSupplierCode())).append(S)
          .append(S)    // empty middle component
          .append(safe(msg.getSupplierCodeQual(), "92")).append(S);

        // GIS;37;
        sb.append("GIS").append(S)
          .append(safe(msg.getGisFlag(), "37")).append(S);

        // NAD;ST;2047;;92;;MAGNA AUTOMOTIVE...;  ← "2047::92" + empty + name
        sb.append("NAD").append(S).append("ST").append(S)
          .append(safe(msg.getShipToCode())).append(S)
          .append(S)    // empty middle component in code
          .append(safe(msg.getShipToCodeQual(), "92")).append(S)
          .append(S)    // empty element between code and name
          .append(safe(msg.getShipToName())).append(S);

        sb.append(NL);
    }

    // ── Delivery lines ────────────────────────────────────────────────────────

    private void appendDeliveryLines(StringBuilder sb, EdiDeliveryLine dl) {
        String prefix = buildLinPrefix(dl);

        // Line 1: QTY+70 + DTM+51 + DTM+52
        // LIN;;;{art};IN;LOC;11;{loc};RFF;ON;{ref};QTY;70;0;PCE;DTM;51;00000000;102;DTM;52;{date};102;
        sb.append(prefix)
          .append("QTY").append(S).append("70").append(S)
          .append(safe(dl.getCumulativeQty(), "0")).append(S)
          .append("PCE").append(S)
          .append("DTM").append(S).append("51").append(S)
          .append(safe(dl.getLastShipDate(), "00000000")).append(S)
          .append("102").append(S)
          .append("DTM").append(S).append("52").append(S)
          .append(safe(dl.getReferenceDate())).append(S)
          .append("102").append(S)
          .append(NL);

        // Line 2: QTY+79 + first SCC
        // LIN;;;{art};IN;...;QTY;79;{qty};PCE;SCC;1;;F;21;
        sb.append(prefix)
          .append("QTY").append(S).append("79").append(S)
          .append(safe(dl.getTotalScheduleQty(), "0")).append(S)
          .append("PCE").append(S);

        if (!dl.getSccBlocks().isEmpty()) {
            appendSccFields(sb, dl.getSccBlocks().get(0));
        }
        sb.append(NL);

        // Delivery entry lines
        List<EdiSccBlock> blocks = dl.getSccBlocks();
        for (int sccIdx = 0; sccIdx < blocks.size(); sccIdx++) {
            EdiSccBlock scc = blocks.get(sccIdx);
            boolean hasNextScc = sccIdx < blocks.size() - 1;
            EdiSccBlock nextScc = hasNextScc ? blocks.get(sccIdx + 1) : null;

            List<EdiScheduleEntry> entries = scc.getEntries();
            for (int ei = 0; ei < entries.size(); ei++) {
                EdiScheduleEntry entry = entries.get(ei);
                boolean isLastInBlock = ei == entries.size() - 1;

                sb.append(prefix)
                  .append("QTY").append(S).append("1").append(S)
                  .append(safe(entry.getQty())).append(S)
                  .append("PCE").append(S);

                if (entry.getFixedDeliveryDate() != null) {
                    sb.append("DTM").append(S).append("2").append(S)
                      .append(entry.getFixedDeliveryDate()).append(S)
                      .append("102").append(S);
                } else if (entry.getPeriodStartDate() != null) {
                    sb.append("DTM").append(S).append("158").append(S)
                      .append(entry.getPeriodStartDate()).append(S)
                      .append("102").append(S)
                      .append("DTM").append(S).append("159").append(S)
                      .append(safe(entry.getPeriodEndDate())).append(S)
                      .append("102").append(S);
                }

                // SCC transition: append next SCC at end of last entry of this block
                if (isLastInBlock && hasNextScc) {
                    appendSccFields(sb, nextScc);
                }

                sb.append(NL);
            }
        }
    }

    // ── UNT ──────────────────────────────────────────────────────────────────

    private void appendUnt(StringBuilder sb, EdiMessage msg) {
        sb.append("UNT").append(S)
          .append(msg.getSegmentCount()).append(S)
          .append(safe(msg.getMessageNumber())).append(S)
          .append(NL);
    }

    // ── UNZ ──────────────────────────────────────────────────────────────────

    private void appendUnz(StringBuilder sb, EdiInterchange interchange) {
        sb.append("UNZ").append(S)
          .append(interchange.getMessageCount()).append(S)
          .append(safe(interchange.getInterchangeRef())).append(S)
          .append(NL);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /**
     * Builds the repeated LIN prefix for every delivery sub-line.
     * LIN;;;{article};IN;LOC;11;{loc};RFF;ON;{ref};
     */
    private String buildLinPrefix(EdiDeliveryLine dl) {
        return "LIN" + S + S + S
                + safe(dl.getArticleRef()) + S
                + safe(dl.getArticleQualifier(), "IN") + S
                + "LOC" + S + "11" + S
                + safe(dl.getDeliveryLocation()) + S
                + "RFF" + S + "ON" + S
                + safe(dl.getOrderReference()) + S;
    }

    /** Outputs SCC;{type};;{horizonType};{period}; */
    private void appendSccFields(StringBuilder sb, EdiSccBlock scc) {
        sb.append("SCC").append(S)
          .append(safe(scc.getSccType())).append(S)
          .append(S)    // empty element
          .append(safe(scc.getHorizonType())).append(S)
          .append(safe(scc.getPeriodValue())).append(S);
    }

    private String safe(String value) {
        return value != null ? value : "";
    }

    private String safe(String value, String defaultValue) {
        return (value != null && !value.isBlank()) ? value : defaultValue;
    }
}
