package tn.sage.rh.edi.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "edi")
public class EdiConfig {
    private String defaultEncoding = "UTF-8";
    private String csvDelimiter = ";";
    private String segmentTerminator = "'";
    private String elementSeparator = "+";
    private String componentSeparator = ":";
    private String releaseCharacter = "?";
    private long maxFileSizeMb = 10;
}
