package tn.sage.rh.permutations.service;

import tn.sage.rh.employee.dto.EmployeeDto;
import tn.sage.rh.permutations.dto.MarkFreeOperatorsRequestDTO;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface FreeOperatorsService {
    void markFreeForDay(MarkFreeOperatorsRequestDTO dto);
    List<EmployeeDto> getEligibleOperatorsForFree(LocalDate day, LocalTime startTime, LocalTime endTime);

}
