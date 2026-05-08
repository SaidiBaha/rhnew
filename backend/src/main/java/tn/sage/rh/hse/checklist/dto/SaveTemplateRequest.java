package tn.sage.rh.hse.checklist.dto;

import lombok.Data;

import java.util.List;

@Data
public class SaveTemplateRequest {
    private String title;
    private String description;
    private List<CategoryRequest> categories;

    @Data
    public static class CategoryRequest {
        private Long id;
        private String name;
        private int orderIndex;
        private List<ItemRequest> items;
    }

    @Data
    public static class ItemRequest {
        private Long id;
        private String label;
        private int orderIndex;
    }
}
