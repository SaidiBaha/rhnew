package tn.sage.rh.edi.exception;

import java.util.List;

public class EdiValidationException extends RuntimeException {
    private final List<String> errors;

    public EdiValidationException(List<String> errors) {
        super("EDI validation failed: " + String.join("; ", errors));
        this.errors = errors;
    }

    public List<String> getErrors() {
        return errors;
    }
}
