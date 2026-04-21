package tn.sage.rh.organization.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.exeption.InvalidOperationException;
import tn.sage.rh.organization.dto.DepartmentMinimalDto;
import tn.sage.rh.organization.entity.Department;
import tn.sage.rh.organization.repository.DepartmentRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {
    private final DepartmentRepository departmentRepository;

    public List<DepartmentMinimalDto> findAll() {
        return departmentRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    public DepartmentMinimalDto create(DepartmentMinimalDto dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new InvalidEntityException("Le nom est obligatoire");
        }
        departmentRepository.findByNameIgnoreCase(dto.getName().trim())
                .ifPresent(existing -> {
                    throw new InvalidEntityException("Un département avec ce nom existe déjà");
                });
        Department saved = departmentRepository.save(Department.builder()
                .name(dto.getName().trim())
                .build());
        return toDto(saved);
    }

    public DepartmentMinimalDto update(Long id, DepartmentMinimalDto dto) {
        Department existing = departmentRepository.findById(id)
                .orElseThrow(() -> new InvalidEntityException("Département introuvable"));
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new InvalidEntityException("Le nom est obligatoire");
        }
        departmentRepository.findByNameIgnoreCaseAndIdNot(dto.getName().trim(), id)
                .ifPresent(dup -> {
                    throw new InvalidEntityException("Un département avec ce nom existe déjà");
                });
        existing.setName(dto.getName().trim());
        return toDto(departmentRepository.save(existing));
    }

    public void delete(Long id) {
        departmentRepository.findById(id)
                .orElseThrow(() -> new InvalidEntityException("Département introuvable"));
        long employeeCount = departmentRepository.countEmployeesByDepartmentId(id);
        if (employeeCount > 0) {
            throw new InvalidOperationException(
                    "Impossible de supprimer : ce département est utilisé par " + employeeCount + " employé(s)");
        }
        departmentRepository.deleteById(id);
    }

    public Department findOrCreateDepartment(String departmentName) {
        if (departmentName != null && !departmentName.trim().isEmpty()) {
            return departmentRepository
                    .findByName(departmentName)
                    .orElseGet(() -> departmentRepository.save(Department.builder()
                            .name(departmentName)
                            .build()));
        }
        return null;
    }

    private DepartmentMinimalDto toDto(Department d) {
        return DepartmentMinimalDto.builder()
                .id(d.getId())
                .name(d.getName())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}
