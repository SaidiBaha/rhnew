package tn.sage.rh.edi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EdiConversionResponseDto {
    private String csvContent;
    private String suggestedFilename;
    private int messageCount;
    private int deliveryLineCount;
    private int totalScheduleEntries;
    private long csvSizeBytes;
}
