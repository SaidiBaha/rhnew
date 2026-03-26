package tn.sage.rh.request;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.request.dto.SaveRequestInputDto;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

import java.security.Principal;
import java.util.List;

import static tn.sage.rh.request.RequestStatus.SOUMIS;
import static tn.sage.rh.user.UserRole.ADMIN;
import static tn.sage.rh.user.UserRole.SUPERVISOR;

@Service
@RequiredArgsConstructor
public class RequestService {
    private final RequestRepository requestRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<Request> findAll(Principal connectedUser) {
        User user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();

        if (user.getRole() == SUPERVISOR) {
            return requestRepository.findAllBySupervisor(user.getEmployee().getId());
        }

        return requestRepository.findAll();
    }

    @Transactional
    public void save(Principal connectedUser, SaveRequestInputDto saveRequestInput) {
        Employee employee = employeeRepository
                .findByMatricule(saveRequestInput.getEmployee())
                .orElseThrow(() -> new EntityNotFoundException("No employee found for this matricule"));

        User user = getManagedUser(connectedUser);

        validateAuthorization(user, saveRequestInput.getEmployee());

        // Block if a SOUMIS request already exists for same type + employee
        requestRepository
                .findFirstByRequestTypeAndStatusAndEmployee_Matricule(
                        saveRequestInput.getRequestType(),
                        SOUMIS,
                        saveRequestInput.getEmployee()
                )
                .ifPresent(r -> {
                    throw new IllegalStateException("An active request of this type already exists for this employee.");
                });

        Request request = Request
                .builder()
                .requestType(saveRequestInput.getRequestType())
                .comment(saveRequestInput.getComment())
                .status(SOUMIS)
                .employee(employee)
                .build();

        requestRepository.save(request);
    }

    @Transactional
    public void update(Principal connectedUser, Long id, SaveRequestInputDto saveRequestInput) {
        Request request = requestRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("No request found for this id"));

        User user = getManagedUser(connectedUser);

        validateAuthorization(user, request.getEmployee().getMatricule());

        updateRequestComment(user, request, saveRequestInput.getComment());
        updateRequestStatus(user, request, saveRequestInput.getStatus());

        requestRepository.save(request);
    }

    public Request findById(Principal connectedUser, Long id) {
        User user = getManagedUser(connectedUser);

        Request request = requestRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("No request found for this id"));

        validateAuthorization(user, request.getEmployee().getMatricule());

        return request;
    }


    @Transactional
    public void delete(Principal connectedUser, Long id) {
        Request request = requestRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("No request found for this id"));

        User user = getManagedUser(connectedUser);

        validateAuthorization(user, request.getEmployee().getMatricule());

        if (user.getRole() == SUPERVISOR) {
            if (request.getStatus() != SOUMIS) {
                throw new IllegalStateException("Supervisor can only delete SOUMIS requests.");
            }
        }

        requestRepository.delete(request);
    }

    @Transactional
    public void close(Principal connectedUser, Long id) {
        Request request = requestRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("No request found for this id"));

        User user = getManagedUser(connectedUser);

        validateAuthorization(user, request.getEmployee().getMatricule());

        if (request.getStatus() != RequestStatus.TRAITÉ) {
            throw new IllegalStateException("Only treated requests can be closed.");
        }

        request.setStatus(RequestStatus.CLÔTURÉ);
        requestRepository.save(request);
    }

    private void updateRequestStatus(User user, Request request, RequestStatus newStatus) {
        if (newStatus == null || request.getStatus() == newStatus) {
            return;
        }

        if (user.getRole() == ADMIN) {
            // Admin can only accept (TRAITÉ) or reject (REJETÉ) a SOUMIS request
            boolean canTraite = newStatus == RequestStatus.TRAITÉ && request.getStatus() == SOUMIS;
            boolean canReject = newStatus == RequestStatus.REJETÉ && request.getStatus() == SOUMIS;
            if (!canTraite && !canReject) {
                throw new IllegalStateException("Admin can only treat or reject a submitted request.");
            }
            request.setStatus(newStatus);
            return;
        }

        if (user.getRole() == SUPERVISOR) {
            throw new IllegalStateException("Supervisor cannot change request status.");
        }
    }

    private void updateRequestComment(User user, Request request, String comment) {
        if (comment == null) {
            return;
        }

        if (user.getRole() == ADMIN) {
            request.setComment(comment);
            return;
        }

        if (user.getRole() == SUPERVISOR) {
            if (request.getStatus() != SOUMIS) {
                throw new IllegalStateException("Request has already been processed.");
            }
            request.setComment(comment);
        }
    }

    private void validateAuthorization(User user, String matricule) {
        if (user.getRole() == ADMIN) {
            return;
        }

        if (user.getRole() == SUPERVISOR) {
            if (user.getEmployee().getMatricule().equals(matricule)) {
                return;
            }

            boolean isOperator = user
                    .getEmployee()
                    .getOperators()
                    .stream()
                    .anyMatch(operator -> operator.getMatricule().equals(matricule));

            if (isOperator) {
                return;
            }
        }

        throw new IllegalStateException("Unauthorized");
    }

    private User getManagedUser(Principal connectedUser) {
        User principalUser = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();

        return userRepository
                .findById(principalUser.getId())
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found"));
    }
}