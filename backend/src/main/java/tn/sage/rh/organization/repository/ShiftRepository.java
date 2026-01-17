package tn.sage.rh.organization.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.organization.entity.Shift;

import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    Optional<Shift> findByName(String name);
}
