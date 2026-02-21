package tn.sage.rh.handlers;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import tn.sage.rh.exeption.EntityNotFoundException;
import tn.sage.rh.exeption.ErrorCodes;
import tn.sage.rh.exeption.InvalidEntityException;
import tn.sage.rh.exeption.InvalidOperationException;

import java.util.Collections;

@Slf4j
@RestControllerAdvice
public class RestExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorDto> handleEntityNotFound(EntityNotFoundException exception, WebRequest webRequest) {

        final HttpStatus status = HttpStatus.NOT_FOUND;

        log.warn("ENTITY_NOT_FOUND | code={} | msg={} | path={}",
                exception.getErrorCode(), exception.getMessage(), webRequest.getDescription(false));

        final ErrorDto errorDto = ErrorDto.builder()
                .code(exception.getErrorCode())
                .httpCode(status.value())
                .message(exception.getMessage())
                .build();

        return new ResponseEntity<>(errorDto, status);
    }

    @ExceptionHandler(InvalidOperationException.class)
    public ResponseEntity<ErrorDto> handleInvalidOperation(InvalidOperationException exception, WebRequest webRequest) {

        final HttpStatus status = HttpStatus.BAD_REQUEST;

        log.warn("INVALID_OPERATION | code={} | msg={} | path={}",
                exception.getErrorCode(), exception.getMessage(), webRequest.getDescription(false));

        final ErrorDto errorDto = ErrorDto.builder()
                .code(exception.getErrorCode())
                .httpCode(status.value())
                .message(exception.getMessage())
                .build();

        return new ResponseEntity<>(errorDto, status);
    }

    @ExceptionHandler(InvalidEntityException.class)
    public ResponseEntity<ErrorDto> handleInvalidEntity(InvalidEntityException exception, WebRequest webRequest) {

        final HttpStatus status = HttpStatus.BAD_REQUEST;

        log.warn("INVALID_ENTITY | code={} | msg={} | errors={} | path={}",
                exception.getErrorCode(), exception.getMessage(), exception.getErrors(), webRequest.getDescription(false));

        final ErrorDto errorDto = ErrorDto.builder()
                .code(exception.getErrorCode())
                .httpCode(status.value())
                .message(exception.getMessage())
                .errors(exception.getErrors())
                .build();

        return new ResponseEntity<>(errorDto, status);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorDto> handleBadCredentials(BadCredentialsException exception, WebRequest webRequest) {

        final HttpStatus status = HttpStatus.BAD_REQUEST;

        log.warn("BAD_CREDENTIALS | msg={} | path={}",
                exception.getMessage(), webRequest.getDescription(false));

        final ErrorDto errorDto = ErrorDto.builder()
                .code(ErrorCodes.BAD_CREDENTIALS)
                .httpCode(status.value())
                .message(exception.getMessage())
                .errors(Collections.singletonList("Login et / ou mot de passe incorrecte"))
                .build();

        return new ResponseEntity<>(errorDto, status);
    }

    /**
     * ✅ Handler générique : pour logger tout ce qui n'est pas géré
     * IMPORTANT : le nom NE DOIT PAS être "handleException"
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDto> handleAllExceptions(Exception exception, WebRequest webRequest) {

        final HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;

        // log ERROR + stacktrace (le "exception" à la fin imprime la stacktrace)
        log.error("UNEXPECTED_ERROR | msg={} | path={}",
                exception.getMessage(), webRequest.getDescription(false), exception);

        final ErrorDto errorDto = ErrorDto.builder()
                .code(ErrorCodes.UNKNOWN_CONTEXT) // ou INVALID_INPUT si tu préfères
                .httpCode(status.value())
                .message("Une erreur inattendue est survenue")
                .errors(Collections.singletonList(exception.getMessage()))
                .build();

        return new ResponseEntity<>(errorDto, status);
    }
}