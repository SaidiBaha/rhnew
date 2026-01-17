package tn.sage.rh.request;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RequestRepository extends JpaRepository<Request, Long> {

    Optional<Request> findFirstByRequestTypeAndStatusAndEmployee_Matricule(RequestType requestType,
                                                                           RequestStatus status,
                                                                           String matricule);

    @Query("select r " +
            "from Request r " +
            "join fetch r.employee e " +
            "where e.id = :supervisorId or e.supervisor.id = :supervisorId " +
            "order by r.createdAt desc")
    List<Request> findAllBySupervisor(@Param("supervisorId") Long supervisorId);

    @Override
    @Query("select r " +
            "from Request r " +
            "join fetch r.employee e " +
            "order by r.createdAt desc")
    List<Request> findAll();
}
