package io.dawsheet.model;

import java.io.IOException;
import com.fasterxml.jackson.annotation.*;

public enum Type {
    STRING;

    @JsonValue
    public String toValue() {
        switch (this) {
            case STRING: return "string";
        }
        return null;
    }

    @JsonCreator
    public static Type forValue(String value) throws IOException {
        if (value.equals("string")) return STRING;
        throw new IOException("Cannot deserialize Type");
    }
}
