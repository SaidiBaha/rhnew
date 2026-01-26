package tn.sage.rh.organization.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.organization.entity.Department;

import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    Optional<Department> findByName(String name);

}
