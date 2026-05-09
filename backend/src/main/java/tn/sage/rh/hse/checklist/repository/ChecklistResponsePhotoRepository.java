package tn.sage.rh.hse.checklist.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.sage.rh.hse.checklist.entity.ChecklistResponsePhoto;

import java.util.List;

public interface ChecklistResponsePhotoRepository extends JpaRepository<ChecklistResponsePhoto, Long> {

    List<ChecklistResponsePhoto> findByResponseIdOrderByUploadedAtAsc(Long responseId);

    long countByResponseId(Long responseId);

    @Query("SELECT p.response.id, COUNT(p) FROM ChecklistResponsePhoto p WHERE p.response.id IN :responseIds GROUP BY p.response.id")
    List<Object[]> countByResponseIdIn(@Param("responseIds") List<Long> responseIds);
}
