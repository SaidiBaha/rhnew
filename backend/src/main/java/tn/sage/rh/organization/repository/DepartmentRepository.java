package tn.sage.rh.organization.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.organization.entity.Department;

import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    Optional<Department> findByName(String name);
    Optional<Department> findByNameIgnoreCase(String name);
    Optional<Department> findByNameIgnoreCaseAndIdNot(String name, Long id);

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.department.id = :id")
    long countEmployeesByDepartmentId(@Param("id") Long id);
}
