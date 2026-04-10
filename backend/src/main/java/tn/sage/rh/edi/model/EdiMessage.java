package tn.sage.rh.edi.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class EdiMessage {
    // UNH fields
    private String messageNumber;
    private String messageType = "DELFOR";
    private String version = "D";
    private String release = "97A";
    private String organization = "UN";

    // BGM fields
    private String bgmDocType = "241";
    private String bgmQual1 = "";
    private String bgmQual2 = "";
    private String bgmQual3 = "PS";
    private String bgmDocRef;
    private String bgmFunction = "5";

    // DTM+137
    private String messageDate;

    // NAD+SU
    private String supplierCode;
    private String supplierCodeQual = "92";

    // GIS
    private String gisFlag = "37";

    // NAD+ST
    private String shipToCode;
    private String shipToCodeQual = "92";
    private String shipToName;

    private List<EdiDeliveryLine> deliveryLines = new ArrayList<>();
    private int segmentCount;
}
