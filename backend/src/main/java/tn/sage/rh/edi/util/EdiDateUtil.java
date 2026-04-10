package tn.sage.rh.edi.util;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public final class EdiDateUtil {

    private static final DateTimeFormatter FORMAT_102 = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String EMPTY_DATE = "00000000";

    private EdiDateUtil() {}

    /**
     * Parses an EDIFACT date string (format 102 = AAAAMMJJ).
     * Returns null for null input, blank input, or "00000000".
     */
    public static LocalDate parseEdiDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank() || EMPTY_DATE.equals(dateStr.trim())) {
            return null;
        }
        try {
            return LocalDate.parse(dateStr.trim(), FORMAT_102);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /**
     * Formats a LocalDate to EDIFACT format 102 (AAAAMMJJ).
     * Returns "00000000" for null.
     */
    public static String formatEdiDate(LocalDate date) {
        if (date == null) return EMPTY_DATE;
        return date.format(FORMAT_102);
    }

    /**
     * Validates that a raw date string is either "00000000" or a valid AAAAMMJJ date.
     */
    public static boolean isValidEdiDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return false;
        if (EMPTY_DATE.equals(dateStr.trim())) return true;
        return parseEdiDate(dateStr) != null;
    }

    /**
     * Converts a 6-digit YYMMDD date from UNB to 8-digit YYYYMMDD.
     * Assumes 21st century (year >= 00 → 2000+).
     */
    public static String expandUnbDate(String yymmdd) {
        if (yymmdd == null || yymmdd.length() != 6) return yymmdd;
        return "20" + yymmdd;
    }
}
