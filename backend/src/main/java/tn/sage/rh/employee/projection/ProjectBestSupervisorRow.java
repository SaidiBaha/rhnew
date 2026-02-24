package tn.sage.rh.employee.projection;

public interface ProjectBestSupervisorRow {
    Long getProjectId();
    Long getSupervisorId();
    String getSupervisorFullName();
    String getSupervisorMatricule();
    Long getOperatorsCount();
}