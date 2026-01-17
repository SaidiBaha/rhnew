package tn.sage.rh.request.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import tn.sage.rh.request.RequestStatus;
import tn.sage.rh.request.RequestType;
import tn.sage.rh.user.UserDto;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class RequestMinimalDto {
    private long id;
    private RequestType requestType;
    private String comment;
    private RequestStatus status;
    private LocalDateTime createdAt;
    private UserDto createdBy;
    private LocalDateTime updatedAt;
    private UserDto updatedBy;
}
