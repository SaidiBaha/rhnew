package tn.sage.rh.organization.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.sage.rh.organization.entity.JobTitle;
import tn.sage.rh.organization.repository.JobTitleRepository;

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
}
