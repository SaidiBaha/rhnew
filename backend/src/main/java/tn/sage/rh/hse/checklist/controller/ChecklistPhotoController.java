package tn.sage.rh.hse.checklist.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.sage.rh.hse.checklist.dto.ChecklistResponsePhotoDto;
import tn.sage.rh.hse.checklist.entity.ChecklistResponsePhoto;
import tn.sage.rh.hse.checklist.service.ChecklistResponsePhotoService;

import java.io.IOException;
import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ChecklistPhotoController {

    private final ChecklistResponsePhotoService photoService;

    @PostMapping("/api/v1/checklist/responses/{responseId}/photos")
    public ResponseEntity<ChecklistResponsePhotoDto> upload(
            @PathVariable Long responseId,
            @RequestParam("file") MultipartFile file,
            Principal principal) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(photoService.upload(responseId, file, principal));
    }

    @GetMapping("/api/v1/checklist/responses/{responseId}/photos")
    public List<ChecklistResponsePhotoDto> getPhotosMeta(@PathVariable Long responseId) {
        return photoService.getPhotosMeta(responseId);
    }

    @GetMapping("/api/v1/checklist/photos/{photoId}")
    public ResponseEntity<byte[]> getPhoto(@PathVariable Long photoId) {
        ChecklistResponsePhoto photo = photoService.getPhotoData(photoId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.getFileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + photo.getFileName() + "\"")
                .body(photo.getData());
    }

    @DeleteMapping("/api/v1/checklist/photos/{photoId}")
    public ResponseEntity<Void> deletePhoto(@PathVariable Long photoId) {
        photoService.delete(photoId);
        return ResponseEntity.noContent().build();
    }
}
