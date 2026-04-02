package tn.sage.rh.edi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EdiValidationResultDto {
    private boolean valid;
    private List<String> errors;
    private int messageCount;
}
