package tn.sage.rh.salary.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.sage.rh.employee.Employee;
import tn.sage.rh.exeption.EntityNotFoundException;
import tn.sage.rh.exeption.ErrorCodes;
import tn.sage.rh.exeption.InvalidOperationException;
import tn.sage.rh.salary.dto.*;
import tn.sage.rh.salary.entity.SalaryAdvanceRequest;
import tn.sage.rh.salary.entity.SalaryAdvanceRequestStatus;
import tn.sage.rh.salary.repository.SalaryAdvanceRequestRepository;
import tn.sage.rh.user.User;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Month;
import java.time.Year;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

import static tn.sage.rh.user.UserRole.ADMIN;
import static tn.sage.rh.user.UserRole.SUPERVISOR;

@Service
@RequiredArgsConstructor
public class SalaryAdvanceRequestService {

    private final SalaryAdvanceRequestRepository salaryAdvanceRequestRepository;

    @Transactional
    public SalaryAdvanceRequestRowDto createMyRequest(Principal connectedUser, SalaryAdvanceRequestCreateDto request) {
        User user = getUserFromPrincipal(connectedUser);
        if (user.getRole() != SUPERVISOR) {
            throw new InvalidOperationException(
                    "Seul un superviseur peut créer une demande d'avance pour lui-même",
                    ErrorCodes.UNAUTHORIZED_OPERATION
            );
        }

        if (request == null || request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidOperationException(
                    "Le montant de la demande doit être supérieur à 0",
                    ErrorCodes.INVALID_INPUT
            );
        }

        Employee requester = user.getEmployee();
        if (requester == null) {
            throw new InvalidOperationException(
                    "Aucun employé lié à l'utilisateur connecté",
                    ErrorCodes.UNKNOWN_CONTEXT
            );
        }

        SalaryAdvanceRequest entity = SalaryAdvanceRequest.builder()
                .requester(requester)
                .amount(request.getAmount())
                .comment(normalizeComment(request.getComment()))
                .status(SalaryAdvanceRequestStatus.EN_COURS)
                .build();

        return toDto(salaryAdvanceRequestRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<SalaryAdvanceRequestRowDto> findMyRequests(Principal connectedUser) {
        User user = getUserFromPrincipal(connectedUser);
        if (user.getRole() != SUPERVISOR) {
            throw new InvalidOperationException(
                    "Seul un superviseur peut consulter ses demandes",
                    ErrorCodes.UNAUTHORIZED_OPERATION
            );
        }

        return salaryAdvanceRequestRepository.findAllByRequesterIdOrderByCreatedAtDesc(user.getEmployee().getId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SalaryAdvanceRequestRowDto> findAllForAdmin(Principal connectedUser) {
        User user = getUserFromPrincipal(connectedUser);
        if (user.getRole() != ADMIN) {
            throw new InvalidOperationException(
                    "Seul un admin peut consulter toutes les demandes d'avance",
                    ErrorCodes.UNAUTHORIZED_OPERATION
            );
        }

        return salaryAdvanceRequestRepository.findAllDetailedOrderByCreatedAtDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public SalaryAdvanceRequestRowDto updateStatus(
            Principal connectedUser,
            Long id,
            SalaryAdvanceRequestStatusUpdateDto request
    ) {
        User user = getUserFromPrincipal(connectedUser);
        if (user.getRole() != ADMIN) {
            throw new InvalidOperationException(
                    "Seul un admin peut modifier le statut d'une demande d'avance",
                    ErrorCodes.UNAUTHORIZED_OPERATION
            );
        }

        if (id == null || request == null || request.getStatus() == null) {
            throw new InvalidOperationException(
                    "L'id et le statut sont obligatoires",
                    ErrorCodes.INVALID_INPUT
            );
        }

        SalaryAdvanceRequest entity = salaryAdvanceRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Demande d'avance introuvable (id=" + id + ")",
                        ErrorCodes.SALARY_ADVANCE_NOT_FOUND
                ));

        entity.setStatus(request.getStatus());
        if (request.getStatus() == SalaryAdvanceRequestStatus.DONE
                || request.getStatus() == SalaryAdvanceRequestStatus.REFUSED) {
            entity.setProcessedAt(LocalDateTime.now());
            entity.setProcessedBy(user);
        } else {
            entity.setProcessedAt(null);
            entity.setProcessedBy(null);
        }

        return toDto(salaryAdvanceRequestRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public SalaryAdvanceRequestDashboardDto getDashboardStats(Principal connectedUser) {
        User user = getUserFromPrincipal(connectedUser);
        if (user.getRole() != ADMIN) {
            throw new InvalidOperationException(
                    "Seul un admin peut consulter les statistiques des demandes d'avance",
                    ErrorCodes.UNAUTHORIZED_OPERATION
            );
        }

        int year = Year.now().getValue();
        LocalDateTime startOfYear = Year.of(year).atDay(1).atStartOfDay();
        LocalDateTime startOfNextYear = Year.of(year + 1).atDay(1).atTime(LocalTime.MIDNIGHT);

        List<SalaryAdvanceRequest> requests = salaryAdvanceRequestRepository.findAllByCreatedYear(
                startOfYear,
                startOfNextYear
        );

        long enCoursCount = requests.stream()
                .filter(r -> r.getStatus() == SalaryAdvanceRequestStatus.EN_COURS)
                .count();
        long doneCount = requests.stream()
                .filter(r -> r.getStatus() == SalaryAdvanceRequestStatus.DONE)
                .count();

        BigDecimal totalAmount = requests.stream()
                .map(SalaryAdvanceRequest::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal enCoursAmount = requests.stream()
                .filter(r -> r.getStatus() == SalaryAdvanceRequestStatus.EN_COURS)
                .map(SalaryAdvanceRequest::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal doneAmount = requests.stream()
                .filter(r -> r.getStatus() == SalaryAdvanceRequestStatus.DONE)
                .map(SalaryAdvanceRequest::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<SalaryAdvanceRequestMonthlyPointDto> monthly = java.util.stream.IntStream.rangeClosed(1, 12)
                .mapToObj(month -> {
                    long total = requests.stream()
                            .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().getMonthValue() == month)
                            .count();
                    long enCours = requests.stream()
                            .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().getMonthValue() == month)
                            .filter(r -> r.getStatus() == SalaryAdvanceRequestStatus.EN_COURS)
                            .count();
                    long done = requests.stream()
                            .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().getMonthValue() == month)
                            .filter(r -> r.getStatus() == SalaryAdvanceRequestStatus.DONE)
                            .count();

                    String label = Month.of(month).getDisplayName(TextStyle.SHORT, Locale.FRENCH);
                    return new SalaryAdvanceRequestMonthlyPointDto(label, total, enCours, done);
                })
                .toList();

        return SalaryAdvanceRequestDashboardDto.builder()
                .totalRequests(requests.size())
                .enCoursCount(enCoursCount)
                .doneCount(doneCount)
                .totalAmount(totalAmount)
                .enCoursAmount(enCoursAmount)
                .doneAmount(doneAmount)
                .monthly(monthly)
                .build();
    }

    private SalaryAdvanceRequestRowDto toDto(SalaryAdvanceRequest entity) {
        Employee requester = entity.getRequester();
        return SalaryAdvanceRequestRowDto.builder()
                .id(entity.getId())
                .requesterId(requester != null ? requester.getId() : null)
                .requesterMatricule(requester != null ? requester.getMatricule() : null)
                .requesterFullName(requester != null ? requester.getFullName() : null)
                .amount(entity.getAmount())
                .comment(entity.getComment())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .processedAt(entity.getProcessedAt())
                .processedByFullName(
                        entity.getProcessedBy() != null && entity.getProcessedBy().getEmployee() != null
                                ? entity.getProcessedBy().getEmployee().getFullName()
                                : null
                )
                .build();
    }

    private String normalizeComment(String comment) {
        if (comment == null) {
            return null;
        }
        String trimmed = comment.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private User getUserFromPrincipal(Principal connectedUser) {
        if (!(connectedUser instanceof UsernamePasswordAuthenticationToken token)) {
            throw new InvalidOperationException(
                    "Principal invalide",
                    ErrorCodes.UNKNOWN_CONTEXT
            );
        }

        Object principal = token.getPrincipal();
        if (!(principal instanceof User user)) {
            throw new InvalidOperationException(
                    "Principal n'est pas un utilisateur",
                    ErrorCodes.UNKNOWN_CONTEXT
            );
        }
        return user;
    }
}
