package tn.sage.rh.employee.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class SupervisorDto {

    private long id;
    private String matricule;
    private String fullName;
    private String departmentName;
    private String jobTitle;
}
