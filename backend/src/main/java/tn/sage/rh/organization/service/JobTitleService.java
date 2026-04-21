package tn.sage.rh.organization.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.exeption.InvalidOperationException;
import tn.sage.rh.organization.dto.JobTitleMinimalDto;
import tn.sage.rh.organization.entity.JobTitle;
import tn.sage.rh.organization.repository.JobTitleRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class JobTitleService {
    private final JobTitleRepository jobTitleRepository;

    public List<JobTitleMinimalDto> findAll() {
        return jobTitleRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public JobTitleMinimalDto create(JobTitleMinimalDto dto) {
        if (dto.getTitle() == null || dto.getTitle().trim().isEmpty()) {
            throw new InvalidEntityException("Le libellé est obligatoire");
        }
        jobTitleRepository.findByTitleIgnoreCase(dto.getTitle().trim())
                .ifPresent(existing -> {
                    throw new InvalidEntityException("Un poste avec ce libellé existe déjà");
                });
        JobTitle saved = jobTitleRepository.save(JobTitle.builder()
                .title(dto.getTitle().trim())
                .build());
        return toDto(saved);
    }

    public JobTitleMinimalDto update(Long id, JobTitleMinimalDto dto) {
        JobTitle existing = jobTitleRepository.findById(id)
                .orElseThrow(() -> new InvalidEntityException("Poste introuvable"));
        if (dto.getTitle() == null || dto.getTitle().trim().isEmpty()) {
            throw new InvalidEntityException("Le libellé est obligatoire");
        }
        jobTitleRepository.findByTitleIgnoreCaseAndIdNot(dto.getTitle().trim(), id)
                .ifPresent(dup -> {
                    throw new InvalidEntityException("Un poste avec ce libellé existe déjà");
                });
        existing.setTitle(dto.getTitle().trim());
        return toDto(jobTitleRepository.save(existing));
    }

    public void delete(Long id) {
        jobTitleRepository.findById(id)
                .orElseThrow(() -> new InvalidEntityException("Poste introuvable"));
        long employeeCount = jobTitleRepository.countEmployeesByJobTitleId(id);
        if (employeeCount > 0) {
            throw new InvalidOperationException(
                    "Impossible de supprimer : ce poste est utilisé par " + employeeCount + " employé(s)");
        }
        jobTitleRepository.deleteById(id);
    }

    public JobTitle findOrCreateJobTitle(String jobTitle) {
        if (jobTitle != null && !jobTitle.trim().isEmpty()) {
            return jobTitleRepository
                    .findByTitle(jobTitle)
                    .orElseGet(() -> jobTitleRepository.save(JobTitle.builder()
                            .title(jobTitle)
                            .build()));
        }
        return null;
    }

    private JobTitleMinimalDto toDto(JobTitle jt) {
        return JobTitleMinimalDto.builder()
                .id(jt.getId())
                .title(jt.getTitle())
                .createdAt(jt.getCreatedAt())
                .updatedAt(jt.getUpdatedAt())
                .build();
    }
}
