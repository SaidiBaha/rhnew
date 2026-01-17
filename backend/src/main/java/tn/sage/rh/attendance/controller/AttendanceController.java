package tn.sage.rh.attendance.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.mapstruct.factory.Mappers;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import tn.sage.rh.attendance.dto.EmployeeAttendanceDto;
import tn.sage.rh.attendance.dto.SaveAttendanceInputDto;
import tn.sage.rh.attendance.mapper.AttendanceMapper;
import tn.sage.rh.attendance.service.AttendanceService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/attendances")
@RequiredArgsConstructor
@Validated
public class AttendanceController {
    private final AttendanceService attendanceService;
    private final AttendanceMapper attendanceMapper = Mappers.getMapper(AttendanceMapper.class);

    @PostMapping("/batch-save")
    public ResponseEntity<?> batchSave(@Valid @RequestBody List<SaveAttendanceInputDto> saveAttendanceInputs) {
        attendanceService.saveAll(saveAttendanceInputs);
        return ResponseEntity.accepted().build();
    }

    @GetMapping
    public List<EmployeeAttendanceDto> findAllByCurrentMonth(Principal connectedUser) {
        return attendanceService
                .findAllByCurrentMonth(connectedUser);
    }
}
