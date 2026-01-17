package tn.sage.rh.request.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import tn.sage.rh.request.RequestStatus;
import tn.sage.rh.request.RequestType;

@Getter
@Setter
@Builder
public class SaveRequestInputDto {
    private String employee;
    private RequestType requestType;
    private String comment;
    private RequestStatus status;
}
