package tn.sage.rh.request;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.employee.EmployeeRepository;
import tn.sage.rh.request.dto.BulkStatusResultDto;
import tn.sage.rh.request.dto.BulkStatusUpdateDto;
import tn.sage.rh.request.dto.SaveRequestInputDto;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

import static tn.sage.rh.request.RequestStatus.ANNULÉ;
import static tn.sage.rh.request.RequestStatus.EN_PROGRESSION;
import static tn.sage.rh.user.UserRole.ADMIN;
import static tn.sage.rh.user.UserRole.SUPER_ADMIN;
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

        requestRepository
                .findFirstByRequestTypeAndStatusAndEmployee_Matricule(
                        saveRequestInput.getRequestType(),
                        EN_PROGRESSION,
                        saveRequestInput.getEmployee()
                )
                .ifPresent((request) -> {
                    throw new IllegalStateException("Request is already in progress");
                });


        Request request = Request
                .builder()
                .requestType(saveRequestInput.getRequestType())
                .comment(saveRequestInput.getComment())
                .status(EN_PROGRESSION)
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
    public void patchStatus(Principal connectedUser, Long id, RequestStatus newStatus) {
        User user = getManagedUser(connectedUser);

        if (user.getRole() != ADMIN && user.getRole() != SUPER_ADMIN) {
            throw new IllegalStateException("Unauthorized");
        }

        Request request = requestRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("No request found for this id"));

        if (request.getStatus() == newStatus) {
            return;
        }

        request.setStatus(newStatus);
        requestRepository.save(request);
    }

    @Transactional
    public BulkStatusResultDto bulkPatchStatus(Principal connectedUser, BulkStatusUpdateDto dto) {
        User user = getManagedUser(connectedUser);

        if (user.getRole() != ADMIN && user.getRole() != SUPER_ADMIN) {
            throw new IllegalStateException("Unauthorized");
        }

        int updated = 0;
        int skipped = 0;

        for (Long id : dto.getIds()) {
            Optional<Request> optional = requestRepository.findById(id);
            if (optional.isEmpty()) {
                skipped++;
                continue;
            }

            Request request = optional.get();
            if (request.getStatus() == dto.getStatus()) {
                skipped++;
                continue;
            }

            request.setStatus(dto.getStatus());
            requestRepository.save(request);
            updated++;
        }

        return new BulkStatusResultDto(updated, skipped);
    }

    private void updateRequestStatus(User user, Request request, RequestStatus newStatus) {
        if (newStatus == null || request.getStatus() == newStatus) {
            return;
        }

        if (user.getRole() == ADMIN || user.getRole() == SUPER_ADMIN) {
            request.setStatus(newStatus);
            return;
        }

        if (user.getRole() == SUPERVISOR) {

            if (newStatus != ANNULÉ) {
                throw new IllegalStateException("Unauthorized");
            }

            if (request.getStatus() != EN_PROGRESSION) {
                throw new IllegalStateException("Request has already been processed.");
            }

            request.setStatus(ANNULÉ);
        }


    }

    private void updateRequestComment(User user, Request request, String comment) {
        if (comment == null) {
            return;
        }

        if (user.getRole() == ADMIN || user.getRole() == SUPER_ADMIN) {
            request.setComment(comment);
            return;
        }

        if (user.getRole() == SUPERVISOR) {
            if (request.getStatus() != EN_PROGRESSION) {
                throw new IllegalStateException("Request has already been processed.");
            }

            request.setComment(comment);
        }
    }

    private void validateAuthorization(User user, String matricule) {
        if (user.getRole() == ADMIN || user.getRole() == SUPER_ADMIN) {
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
