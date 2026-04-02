package tn.sage.rh.edi.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents one SCC (Schedule Condition Code) block.
 * Type 1 = Firm, Type 4 = Forecast (W=weekly, M=monthly).
 */
@Data
public class EdiSccBlock {
    private String sccType;      // "1" (firm) or "4" (forecast)
    private String horizonType;  // "F", "W", "M"
    private String periodValue;  // "21", "10", etc.

    private List<EdiScheduleEntry> entries = new ArrayList<>();
}
