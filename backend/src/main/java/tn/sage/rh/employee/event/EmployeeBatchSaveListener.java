package tn.sage.rh.employee.event;

import lombok.AllArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.salary.service.SalaryAdvanceService;
import tn.sage.rh.user.UserService;

import java.util.List;

@Component
@AllArgsConstructor
public class EmployeeBatchSaveListener {
    private final SalaryAdvanceService salaryAdvanceService;
    private final UserService userService;

    @EventListener
    @Transactional
    public void onEvent(EmployeeBatchSaveEvent event) {
        List<Employee> employees = event.getEmployees();

        if (employees.isEmpty()) return;

        salaryAdvanceService.batchCreate(employees);
        userService.batchCreate(employees);
    }
}
