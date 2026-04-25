package tn.sage.rh.request.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class BulkStatusResultDto {
    private int updated;
    private int skipped;
}
