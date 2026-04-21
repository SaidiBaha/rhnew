package tn.sage.rh.organization.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.organization.entity.ProductionLine;

import java.util.List;
import java.util.Optional;

public interface ProductionLineRepository extends JpaRepository<ProductionLine, Long> {
    Optional<ProductionLine> findByName(String name);
    List<ProductionLine> findByNameNotIn(List<String> names);
    Optional<ProductionLine> findByNameIgnoreCase(String name);
    Optional<ProductionLine> findByNameIgnoreCaseAndIdNot(String name, Long id);

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.productionLine.id = :id")
    long countEmployeesByProductionLineId(@Param("id") Long id);

    @Query("SELECT COUNT(p) FROM Permutation p WHERE p.productionLine.id = :id")
    long countPermutationsByProductionLineId(@Param("id") Long id);
}
