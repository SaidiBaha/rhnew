// tn/sage/rh/dashboard/dto/ProjectHoursAggDTO.java
package tn.sage.rh.dashboard.dto;

import lombok.Getter;

@Getter
public class ProjectHoursAggDTO {

    private double heuresAjoutees = 0.0;
    private double heuresTransferees = 0.0;

    public void addAjoutees(double h) {
        if (h > 0) this.heuresAjoutees += h;
    }

    public void addTransferees(double h) {
        if (h > 0) this.heuresTransferees += h;
    }
}
