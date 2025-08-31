package io.dawsheet.schema;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class SchemaValidatorTest {

    @Test
    void validNotePlayEnvelope_passesValidation() {
        String json = "{" +
                "\"v\":1,\"type\":\"NOTE.PLAY\",\"id\":\"cmd_001\",\"origin\":\"sheets://Grid!A5\"," +
                "\"at\":\"now\",\"target\":\"default\",\"payload\":{\"note\":\"C4\",\"velocity\":100,\"durationSec\":0.5,\"channel\":1}" +
                "}";
        assertDoesNotThrow(() -> SchemaValidator.validate(json));
    }

    @Test
    void invalidEnvelope_missingRequiredField_failsValidation() {
        // Missing 'id'
        String json = "{" +
                "\"v\":1,\"type\":\"NOTE.PLAY\",\"origin\":\"sheets://Grid!A5\",\"at\":\"now\",\"target\":\"default\"," +
                "\"payload\":{\"note\":60,\"velocity\":100,\"durationSec\":0.2,\"channel\":1}" +
                "}";
    IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> SchemaValidator.validate(json));
    // The exact message may vary, but it should complain about 'id'
    assert(ex.getMessage().toLowerCase().contains("id"));
    }
}
