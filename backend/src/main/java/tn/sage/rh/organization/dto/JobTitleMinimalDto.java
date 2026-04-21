package tn.sage.rh.organization.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobTitleMinimalDto {
    private long id;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
