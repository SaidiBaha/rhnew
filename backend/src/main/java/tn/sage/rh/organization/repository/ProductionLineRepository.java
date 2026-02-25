package tn.sage.rh.organization.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.sage.rh.organization.entity.ProductionLine;

import java.util.Optional;

public interface ProductionLineRepository extends JpaRepository<ProductionLine, Long> {
    Optional<ProductionLine> findByName(String name);
    

}
