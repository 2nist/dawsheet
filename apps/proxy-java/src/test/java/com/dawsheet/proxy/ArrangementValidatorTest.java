package com.dawsheet.proxy;

import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

public class ArrangementValidatorTest {
    @Test
    public void validatesMinimalArrangement() {
        Map<String,Object> arr = new HashMap<>();
        arr.put("version", 1);
        arr.put("title", "Test Song");
        Map<String,Object> section = new HashMap<>();
        section.put("name", "Intro");
        section.put("commands", List.of(Map.of("type", "REAPER.PLAY")));
        arr.put("sections", List.of(section));
        var errs = ArrangementValidator.validate(arr);
        assertTrue(errs.isEmpty(), "Expected no validation errors, got: " + errs);
    }

    @Test
    public void failsOnMissingTitle() {
        Map<String,Object> arr = new HashMap<>();
        arr.put("version", 1);
        arr.put("sections", List.of());
        var errs = ArrangementValidator.validate(arr);
        assertFalse(errs.isEmpty(), "Expected errors for missing title");
    }
}
