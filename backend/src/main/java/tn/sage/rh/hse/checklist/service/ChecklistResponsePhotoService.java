package tn.sage.rh.hse.checklist.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tn.sage.rh.exeption.EntityNotFoundException;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.exeption.InvalidOperationException;
import tn.sage.rh.hse.checklist.dto.ChecklistResponsePhotoDto;
import tn.sage.rh.hse.checklist.entity.ChecklistResponse;
import tn.sage.rh.hse.checklist.entity.ChecklistResponsePhoto;
import tn.sage.rh.hse.checklist.repository.ChecklistResponsePhotoRepository;
import tn.sage.rh.hse.checklist.repository.ChecklistResponseRepository;
import tn.sage.rh.user.User;
import tn.sage.rh.user.UserRepository;

import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChecklistResponsePhotoService {

    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;
    private static final int MAX_PHOTOS_PER_RESPONSE = 5;

    private final ChecklistResponsePhotoRepository photoRepository;
    private final ChecklistResponseRepository responseRepository;
    private final UserRepository userRepository;

    @Transactional
    public ChecklistResponsePhotoDto upload(Long responseId, MultipartFile file, Principal principal) throws IOException {
        ChecklistResponse response = responseRepository.findById(responseId)
                .orElseThrow(() -> new InvalidEntityException("Réponse introuvable"));

        if (response.getResponse() != ChecklistResponse.ResponseType.NOK) {
            throw new InvalidOperationException("Les photos ne sont autorisées que pour les réponses N'OK");
        }

        long count = photoRepository.countByResponseId(responseId);
        if (count >= MAX_PHOTOS_PER_RESPONSE) {
            throw new InvalidOperationException("Maximum " + MAX_PHOTOS_PER_RESPONSE + " photos par point N'OK");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new InvalidEntityException("Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.");
        }

        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new InvalidEntityException("Taille maximale par image : 5 Mo");
        }

        User user = null;
        if (principal != null) {
            user = userRepository.findByEmployee_Matricule(principal.getName()).orElse(null);
        }

        ChecklistResponsePhoto photo = ChecklistResponsePhoto.builder()
                .response(response)
                .fileName(file.getOriginalFilename())
                .fileType(contentType)
                .fileSize(file.getSize())
                .data(file.getBytes())
                .uploadedBy(user)
                .build();

        return toDto(photoRepository.save(photo));
    }

    public List<ChecklistResponsePhotoDto> getPhotosMeta(Long responseId) {
        return photoRepository.findByResponseIdOrderByUploadedAtAsc(responseId)
                .stream().map(this::toDto).toList();
    }

    public ChecklistResponsePhoto getPhotoData(Long photoId) {
        return photoRepository.findById(photoId)
                .orElseThrow(() -> new EntityNotFoundException("Photo introuvable"));
    }

    @Transactional
    public void delete(Long photoId) {
        photoRepository.findById(photoId)
                .orElseThrow(() -> new EntityNotFoundException("Photo introuvable"));
        photoRepository.deleteById(photoId);
    }

    public Map<Long, Integer> countByResponseIds(List<Long> responseIds) {
        if (responseIds.isEmpty()) return Map.of();
        return photoRepository.countByResponseIdIn(responseIds).stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> ((Long) row[1]).intValue()
                ));
    }

    private ChecklistResponsePhotoDto toDto(ChecklistResponsePhoto p) {
        String uploaderName = null;
        if (p.getUploadedBy() != null && p.getUploadedBy().getEmployee() != null) {
            uploaderName = p.getUploadedBy().getEmployee().getFullName();
        }
        return ChecklistResponsePhotoDto.builder()
                .id(p.getId())
                .responseId(p.getResponse().getId())
                .fileName(p.getFileName())
                .fileType(p.getFileType())
                .fileSize(p.getFileSize())
                .uploadedAt(p.getUploadedAt())
                .uploadedByName(uploaderName)
                .build();
    }
}
