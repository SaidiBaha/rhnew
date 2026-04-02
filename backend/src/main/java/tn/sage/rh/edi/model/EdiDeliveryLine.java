package tn.sage.rh.edi.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class EdiDeliveryLine {
    // LIN fields
    private String articleRef;
    private String articleQualifier = "IN";

    // LOC+11
    private String deliveryLocation;

    // RFF+ON
    private String orderReference;

    // QTY+70
    private String cumulativeQty = "0";

    // DTM+51
    private String lastShipDate = "00000000";

    // DTM+52
    private String referenceDate;

    // QTY+79
    private String totalScheduleQty;

    // SCC blocks with their schedule entries
    private List<EdiSccBlock> sccBlocks = new ArrayList<>();
}
