package tn.sage.rh.attendance.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.sage.rh.attendance.entity.AbsenceReason;
import tn.sage.rh.attendance.repository.AbsenceReasonRepository;

@Service
@RequiredArgsConstructor
public class AbsenceReasonService {
    private final AbsenceReasonRepository absenceReasonRepository;

    public AbsenceReason findOrSave(String reason) {
        if (reason.isBlank()) {
            return null;
        }
        return absenceReasonRepository
                .findByReason(reason)
                .orElseGet(() -> absenceReasonRepository.save(AbsenceReason.builder().reason(reason).build()));
    }
}
