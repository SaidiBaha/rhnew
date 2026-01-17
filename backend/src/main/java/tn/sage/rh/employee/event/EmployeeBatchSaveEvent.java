package tn.sage.rh.employee.event;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import tn.sage.rh.employee.Employee;

import java.util.List;

@Getter
@RequiredArgsConstructor
public class EmployeeBatchSaveEvent {
    private final List<Employee> employees;
}
