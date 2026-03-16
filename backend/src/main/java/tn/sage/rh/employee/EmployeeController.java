package tn.sage.rh.employee;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.mapstruct.factory.Mappers;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.employee.dto.*;

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
    public ResponseEntity<Void> save(@Valid @RequestBody EmployeeRequestDto request) {
        employeeService.save(request);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/batch-save")
    public ResponseEntity<Void> batchSave(@Valid @RequestBody List<EmployeeRequestDto> employees) {
        employeeService.batchSave(employees);
        return ResponseEntity.accepted().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> update(@PathVariable Long id, @Valid @RequestBody EmployeeRequestDto request) {
        employeeService.update(id, request);
        return ResponseEntity.accepted().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        employeeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/pagination")
    public ResponseEntity<PageResponse<EmployeeDto>> findAllPaginated(
            Principal connectedUser,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false)    String search,
            @RequestParam(required = false)    String productionLine,
            @RequestParam(required = false)    String shift,
            @RequestParam(required = false)    String employmentType,
            @RequestParam(required = false)    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hireDateFrom,
            @RequestParam(required = false)    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hireDateTo
    ) {
        Page<Employee> employeePage = employeeService.findAllByPagination(
                connectedUser, search, productionLine, shift, employmentType, hireDateFrom, hireDateTo,
                PageRequest.of(page, size));

        return ResponseEntity.ok(
                PageResponse.<EmployeeDto>builder()
                        .content(employeePage.getContent().stream()
                                .map(employeeMapper::toDTO)
                                .toList())
                        .pageNumber(employeePage.getNumber())
                        .pageSize(employeePage.getSize())
                        .totalElements(employeePage.getTotalElements())
                        .totalPages(employeePage.getTotalPages())
                        .first(employeePage.isFirst())
                        .last(employeePage.isLast())
                        .build()
        );
    }

    @GetMapping
    public ResponseEntity<Page<EmployeeDto>> findAll(
            Principal connectedUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "") String search
    ) {
        return ResponseEntity.ok(
                employeeService.search(connectedUser, search, page, size)
                        .map(employeeMapper::toDTO)
        );
    }

    @GetMapping("/search")
    public ResponseEntity<Page<EmployeeDto>> search(
            Principal connectedUser,
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        return ResponseEntity.ok(
                employeeService.search(connectedUser, query, page, size)
                        .map(employeeMapper::toDTO)
        );
    }

    @GetMapping("/supervisors")
    public ResponseEntity<List<SupervisorDto>> findAllSupervisors() {
        return ResponseEntity.ok(employeeService.findAllSupervisors());
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

    @PutMapping("/mark-free")
    public ResponseEntity<Void> markOperatorsAsFree(@Valid @RequestBody EmployeeFreeRequestDto request) {
        employeeService.markOperatorsAsFree(request.getEmployeeIds());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/mark-busy")
    public ResponseEntity<Void> markOperatorsAsBusy(@Valid @RequestBody EmployeeFreeRequestDto request) {
        employeeService.markOperatorsAsBusy(request.getEmployeeIds());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/free")
    public ResponseEntity<List<EmployeeDto>> getFreeEmployees(Principal connectedUser) {
        return ResponseEntity.ok(
                employeeService.findFreeEmployeesForCurrentSupervisor(connectedUser)
                        .stream()
                        .map(employeeMapper::toDTO)
                        .toList()
        );
    }

    @GetMapping("/operators/free")
    public ResponseEntity<List<OperatorAvailabilityDTO>> freeOperators() {
        return ResponseEntity.ok(employeeService.getFreeOperatorsForOperationalManager());
    }
}