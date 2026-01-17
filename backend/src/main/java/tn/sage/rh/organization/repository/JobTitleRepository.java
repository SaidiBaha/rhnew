package tn.sage.rh.organization.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.organization.entity.JobTitle;

import java.util.Optional;

public interface JobTitleRepository extends JpaRepository<JobTitle, Long> {
    Optional<JobTitle> findByTitle(String title);
}
