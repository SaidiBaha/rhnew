package tn.sage.rh.organization.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.sage.rh.organization.entity.JobTitle;
import tn.sage.rh.organization.repository.JobTitleRepository;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class JobTitleService {
    private final JobTitleRepository jobTitleRepository;

    public JobTitle findOrCreateJobTitle(String jobTitle) {
        if (jobTitle != null && !jobTitle.trim().isEmpty()) {
            return jobTitleRepository
                    .findByTitle(jobTitle)
                    .orElseGet(() -> jobTitleRepository.save(JobTitle
                            .builder()
                            .title(jobTitle)
                            .build()));
        }
        return null;
    }
  /*  public Optional<JobTitle> findByTitle(String title) {
        if (title == null || title.isEmpty()) {
            return Optional.empty();
        }
        return jobTitleRepository.findByTitleIgnoreCase(title.toUpperCase());
    }

    public boolean existsByTitle(String title) {
        return findByTitle(title).isPresent();
    }
    public List<JobTitle> findAll() {
        return jobTitleRepository.findAll();
    }*/

}
