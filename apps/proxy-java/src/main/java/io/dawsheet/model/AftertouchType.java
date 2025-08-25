package io.dawsheet.model;

import java.io.IOException;
import com.fasterxml.jackson.annotation.*;

public enum AftertouchType {
    OBJECT;

    @JsonValue
    public String toValue() {
        switch (this) {
            case OBJECT: return "object";
        }
        return null;
    }

    @JsonCreator
    public static AftertouchType forValue(String value) throws IOException {
        if (value.equals("object")) return OBJECT;
        throw new IOException("Cannot deserialize AftertouchType");
    }
}
