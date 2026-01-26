package tn.sage.rh.organization.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.sage.rh.organization.entity.EmploymentType;
import tn.sage.rh.organization.repository.EmploymentTypeRepository;

@Service
@RequiredArgsConstructor
public class EmploymentTypeService {
    private final EmploymentTypeRepository employmentTypeRepository;

    public EmploymentType findOrCreateEmploymentType(String employmentType) {
        if (employmentType != null && !employmentType.trim().isEmpty()) {
            return employmentTypeRepository
                    .findByType(employmentType)
                    .orElseGet(() -> employmentTypeRepository.save(EmploymentType
                            .builder()
                            .type(employmentType)
                            .build()));
        }
        return null;
    }



}
