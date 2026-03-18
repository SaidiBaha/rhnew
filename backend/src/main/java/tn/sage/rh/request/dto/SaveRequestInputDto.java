package tn.sage.rh.request.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.sage.rh.request.RequestStatus;
import tn.sage.rh.request.RequestType;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveRequestInputDto {
    private String employee;
    private RequestType requestType;
    private String comment;
    private RequestStatus status;
}