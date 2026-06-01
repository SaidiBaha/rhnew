package tn.sage.rh.hse.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HseNokPointItem {
    private Long itemId;
    private String itemLabel;
    private String categoryName;
    private long nokCount;
}
