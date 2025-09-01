package com.dawsheet.proxy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ArrangementValidator {
    private static final ObjectMapper M = new ObjectMapper();
    private static volatile JsonSchema schema;

    private static JsonSchema getSchema() {
        if (schema == null) {
            synchronized (ArrangementValidator.class) {
                if (schema == null) {
                    try (InputStream in = ArrangementValidator.class.getClassLoader().getResourceAsStream("schemas/arrangement.schema.json")) {
                        if (in == null) throw new IllegalStateException("schemas/arrangement.schema.json not found on classpath");
                        JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
                        JsonNode node = M.readTree(in);
                        schema = factory.getSchema(node);
                    } catch (Exception e) {
                        throw new RuntimeException("Failed loading arrangement schema: " + e, e);
                    }
                }
            }
        }
        return schema;
    }

    public static List<String> validate(Map<String, Object> arrangement) {
        try {
            JsonNode data = M.valueToTree(arrangement);
            List<String> errors = new ArrayList<>();
            for (ValidationMessage vm : getSchema().validate(data)) {
                errors.add(vm.getMessage());
            }
            return errors;
        } catch (Exception e) {
            List<String> err = new ArrayList<>();
            err.add("validation_failed: " + e.getMessage());
            return err;
        }
    }
}
