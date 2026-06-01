package tn.sage.rh.hse.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HseNokCategoryItem {
    private String categoryName;
    private long nokCount;
}
