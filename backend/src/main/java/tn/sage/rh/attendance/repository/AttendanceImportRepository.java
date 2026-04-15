package tn.sage.rh.attendance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tn.sage.rh.attendance.entity.AttendanceImport;

import java.util.Optional;

@Repository
public interface AttendanceImportRepository extends JpaRepository<AttendanceImport, String> {

    /** Dernier import enregistré (le plus récent). */
    @Query("SELECT ai FROM AttendanceImport ai ORDER BY ai.importedAt DESC LIMIT 1")
    Optional<AttendanceImport> findLatest();
}
