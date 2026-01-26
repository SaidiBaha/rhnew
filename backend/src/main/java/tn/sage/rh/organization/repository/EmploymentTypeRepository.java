package tn.sage.rh.organization.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.organization.entity.EmploymentType;

import java.util.Optional;

public interface EmploymentTypeRepository extends JpaRepository<EmploymentType, Long> {
    Optional<EmploymentType> findByType(String type);

}
