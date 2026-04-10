package tn.sage.rh.edi.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class EdiInterchange {
    // UNB fields
    private String syntaxId = "UNOA";
    private String syntaxVersion = "1";
    private String senderCode;
    private String receiverCode;
    private String date;
    private String time;
    private String interchangeRef;
    private String applicationRef = "";
    private String trailingField = "LAB";

    private List<EdiMessage> messages = new ArrayList<>();
    private int messageCount;
}
