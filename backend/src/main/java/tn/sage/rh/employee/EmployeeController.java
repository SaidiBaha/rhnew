package tn.sage.rh.employee;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.mapstruct.factory.Mappers;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.employee.dto.EmployeeRequestDto;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
@Validated
public class EmployeeController {
    private final EmployeeService employeeService;
    private final EmployeeMapper employeeMapper = Mappers.getMapper(EmployeeMapper.class);

    @PostMapping
    public ResponseEntity<?> save(
            @Valid @RequestBody EmployeeRequestDto request
    ) {
        employeeService.save(request);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/batch-save")
    public ResponseEntity<?> batchSave(
            @Valid @RequestBody List<EmployeeRequestDto> employees
    ) {
        employeeService.batchSave(employees);
        return ResponseEntity.accepted().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody EmployeeRequestDto request) {
        employeeService.update(id, request);
        return ResponseEntity.accepted().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        employeeService.delete(id);
        return ResponseEntity.noContent().build();
    }
    @GetMapping
    public ResponseEntity<List<EmployeeDto>> findAll(Principal connectedUser) {
        return ResponseEntity.ok(
                employeeService.findAll(connectedUser)
                        .stream()
                        .map(employeeMapper::toDTO)
                        .toList()
        );
    }

    @GetMapping("/supervisors")
    public ResponseEntity<List<EmployeeDto>> findAllSupervisors() {
        return ResponseEntity.ok(
                employeeService.findAllSupervisors()
                        .stream()
                        .map(employeeMapper::toDTO)
                        .toList()
        );
    }
    @GetMapping("/{id}")
    public ResponseEntity<EmployeeDto> findById(@PathVariable Long id) {
        return employeeService.findByIdOrMatricule(id, null)
                .map(employee -> ResponseEntity.ok(employeeMapper.toDTO(employee)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    @GetMapping("/available")
    public ResponseEntity<List<EmployeeDto>> getAvailableOperators(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return ResponseEntity.ok(
                employeeService.findAvailableOperators(startDate, endDate)
                        .stream()
                        .map(employeeMapper::toDTO)
                        .toList()
        );
    }
}
