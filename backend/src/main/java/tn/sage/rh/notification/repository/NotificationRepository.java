package tn.sage.rh.notification.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.sage.rh.notification.entity.Notification;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndLuFalse(Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.lu = true WHERE n.userId = :userId")
    void markAllAsReadByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.lu = true WHERE n.id = :id AND n.userId = :userId")
    void markOneAsRead(@Param("id") String id, @Param("userId") Long userId);
}
