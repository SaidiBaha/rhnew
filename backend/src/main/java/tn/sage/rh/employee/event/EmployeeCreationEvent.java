package tn.sage.rh.employee.event;

import lombok.Getter;
import lombok.Setter;
import tn.sage.rh.employee.Employee;

@Getter
@Setter
public class EmployeeCreationEvent {
    private Employee employee;

    public EmployeeCreationEvent(Employee employee) {
        this.employee = employee;
    }
}
