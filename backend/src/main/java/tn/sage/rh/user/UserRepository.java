package tn.sage.rh.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmployee_Matricule(String matricule);

    Optional<User> findByEmployee_Email(String email);

    @Query("select u.employee.matricule " +
            "from User u " +
            "where u.employee.matricule in :matricules"
    )
    Set<String> findByEmployee_MatriculeIn(@Param("matricules") Collection<String> matricules);

    @Query("select u from User u where u.role = :role and upper(u.employee.jobTitle.title) = upper(:jobTitle)")
    List<User> findByRoleAndEmployeeJobTitle(@Param("role") UserRole role, @Param("jobTitle") String jobTitle);

}
