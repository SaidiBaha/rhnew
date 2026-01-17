package tn.sage.rh.organization.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.sage.rh.organization.entity.Department;
import tn.sage.rh.organization.entity.Shift;
import tn.sage.rh.organization.repository.DepartmentRepository;
import tn.sage.rh.organization.repository.ShiftRepository;

@Service
@RequiredArgsConstructor
public class ShiftService {
    private final ShiftRepository shiftRepository;

    public Shift findOrCreateShift(String shift) {
        if (shift != null && !shift.trim().isEmpty()) {
            return shiftRepository
                    .findByName(shift)
                    .orElseGet(() -> shiftRepository.save(Shift
                            .builder()
                            .name(shift)
                            .build()));
        }
        return null;
    }
}
