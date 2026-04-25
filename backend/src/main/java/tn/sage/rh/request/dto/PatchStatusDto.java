package tn.sage.rh.request.dto;

import lombok.Getter;
import lombok.Setter;
import tn.sage.rh.request.RequestStatus;

@Getter
@Setter
public class PatchStatusDto {
    private RequestStatus status;
}
