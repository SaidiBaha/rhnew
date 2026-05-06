package tn.sage.rh.notification.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationDto {
    private String id;
    private String titre;
    private String message;
    private String lien;
    private boolean lu;
    private LocalDateTime createdAt;
}
