package tn.sage.rh.organization.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.sage.rh.organization.entity.Department;
import tn.sage.rh.organization.repository.DepartmentRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DepartmentService {
    private final DepartmentRepository departmentRepository;

    public Department findOrCreateDepartment(String departmentName) {
        if (departmentName != null && !departmentName.trim().isEmpty()) {
            return getDepartment(departmentName);
        }
        return null;
    }

    private Department getDepartment(String departmentName) {
        return departmentRepository
                .findByName(departmentName)
                .orElseGet(() -> departmentRepository.save(Department
                        .builder()
                        .name(departmentName)
                        .build()));
    }
 /*   public Optional<Department> findByName(String name) {
        return departmentRepository.findByNameIgnoreCase(name.toUpperCase());
    }*/

}
