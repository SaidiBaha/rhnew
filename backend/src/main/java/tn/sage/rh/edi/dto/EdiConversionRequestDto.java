package tn.sage.rh.edi.dto;

import lombok.Data;

@Data
public class EdiConversionRequestDto {
    private String ediContent;
    private String fileName;   // optionnel — pour l'historique
}
