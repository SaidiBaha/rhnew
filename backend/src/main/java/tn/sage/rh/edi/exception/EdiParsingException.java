package tn.sage.rh.edi.exception;

public class EdiParsingException extends RuntimeException {
    public EdiParsingException(String message) {
        super(message);
    }

    public EdiParsingException(String message, Throwable cause) {
        super(message, cause);
    }
}
