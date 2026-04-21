package tn.sage.rh.organization.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.organization.entity.JobTitle;

import java.util.Optional;

public interface JobTitleRepository extends JpaRepository<JobTitle, Long> {
    Optional<JobTitle> findByTitle(String title);
    Optional<JobTitle> findByTitleIgnoreCase(String title);
    Optional<JobTitle> findByTitleIgnoreCaseAndIdNot(String title, Long id);

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.jobTitle.id = :id")
    long countEmployeesByJobTitleId(@Param("id") Long id);
}
