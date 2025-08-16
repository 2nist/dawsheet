package io.dawsheet.server;

import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.InputStream;
import java.util.Set;

public class CommandEnvelopeValidator {
    private final JsonSchema schema;
    private final ObjectMapper mapper = new ObjectMapper();

    public CommandEnvelopeValidator(String schemaResourcePath) throws Exception {
        JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
        try (InputStream is = CommandEnvelopeValidator.class.getClassLoader().getResourceAsStream(schemaResourcePath)) {
            if (is == null) {
                throw new IllegalArgumentException("Schema resource not found on classpath: " + schemaResourcePath);
            }
            JsonNode schemaNode = mapper.readTree(is);
            this.schema = factory.getSchema(schemaNode);
        }
    }

    public Set<ValidationMessage> validate(CommandEnvelope envelope) throws Exception {
        JsonNode node = mapper.valueToTree(envelope);
        return schema.validate(node);
    }
}
