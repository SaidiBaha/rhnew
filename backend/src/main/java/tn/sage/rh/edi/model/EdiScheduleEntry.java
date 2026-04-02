package tn.sage.rh.edi.model;

import lombok.Data;

/**
 * One QTY+1 entry with its associated date information.
 * Either fixedDeliveryDate (DTM+2) OR periodStartDate+periodEndDate (DTM+158/159).
 */
@Data
public class EdiScheduleEntry {
    private String qty;
    private String fixedDeliveryDate;  // DTM+2  — exact delivery date
    private String periodStartDate;    // DTM+158 — start of delivery period
    private String periodEndDate;      // DTM+159 — end of delivery period
}
