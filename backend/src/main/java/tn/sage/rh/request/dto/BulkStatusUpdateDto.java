package tn.sage.rh.request.dto;

import lombok.Getter;
import lombok.Setter;
import tn.sage.rh.request.RequestStatus;

import java.util.List;

@Getter
@Setter
public class BulkStatusUpdateDto {
    private List<Long> ids;
    private RequestStatus status;
}
