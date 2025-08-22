package io.dawsheet;

import com.google.api.core.ApiFuture;
import com.google.api.core.ApiFutures;
import com.google.cloud.pubsub.v1.MessageReceiver;
import com.google.cloud.pubsub.v1.Subscriber;
import com.google.pubsub.v1.PubsubMessage;
import com.google.pubsub.v1.ProjectSubscriptionName;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.dawsheet.midi.MidiOut;
import io.dawsheet.midi.NoteUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * DAWSheet Java Proxy
 *
 * Listens to a Pub/Sub subscription for commands and executes them in real time via MIDI.
 *
 * Environment variables:
 * - GCP_PROJECT_ID   (required)  e.g., my-gcp-project
 * - COMMANDS_SUB     (required)  e.g., dawsheet.commands.subscriber
 * - STATUS_TOPIC     (optional)  e.g., dawsheet.status (to publish ACKs)
 * - MIDI_OUT         (optional)  partial name of desired MIDI output device; defaults to Java Synthesizer
 * - PROXY_ID         (optional)  identifier for ACKs (default: java-proxy)
 */
public class App {
    private static final Logger log = LoggerFactory.getLogger(App.class);
    private static final Gson gson = new Gson();

    public static void main(String[] args) throws Exception {
        final String projectId = getenvRequired("GCP_PROJECT_ID");
        final String subId = getenvRequired("COMMANDS_SUB");
        final String statusTopic = System.getenv().getOrDefault("STATUS_TOPIC", "");
        final String midiOutName = System.getenv().getOrDefault("MIDI_OUT", "");
        final String proxyId = System.getenv().getOrDefault("PROXY_ID", "java-proxy");

        log.info("Starting DAWSheet proxy — project={}, sub={}, midiOut='{}'", projectId, subId, midiOutName);

        try (MidiOut midi = new MidiOut(midiOutName)) {
            final CountDownLatch ready = new CountDownLatch(1);
            final ProjectSubscriptionName subscriptionName = ProjectSubscriptionName.of(projectId, subId);

            MessageReceiver receiver = (message, consumer) -> {
                String data = message.getData().toStringUtf8();
                try {
                    JsonObject root = gson.fromJson(data, JsonObject.class);
                    if (root == null || !root.has("type")) {
                        throw new IllegalArgumentException("Missing 'type' field");
                    }
                    String type = root.get("type").getAsString();
                    boolean ok = false;
                    String origin = root.has("origin") ? root.get("origin").getAsString() : null;

                    switch (type) {
                        case "NOTE":
                            ok = handleLegacyNote(root, midi);
                            break;
                        case "NOTE.PLAY":
                            ok = handleEnvelopeNote(root, midi);
                            origin = Optional.ofNullable(origin)
                                    .orElseGet(() -> root.has("origin") ? root.get("origin").getAsString() : "");
                            break;
                        default:
                            log.debug("Unhandled type: {} — ignoring", type);
                    }

                    if (!statusTopic.isEmpty() && origin != null && !origin.isBlank()) {
                        publishAck(projectId, statusTopic, origin, proxyId, ok, null);
                    }
                    consumer.ack();
                } catch (Exception ex) {
                    log.error("Failed to process message {}: {}", message.getMessageId(), ex.toString());
                    if (!statusTopic.isEmpty()) {
                        String origin = safeOrigin(data);
                        publishAck(projectId, statusTopic, origin, proxyId, false, ex.getMessage());
                    }
                    consumer.ack(); // avoid redelivery loop for malformed messages
                }
            };

            Subscriber subscriber = Subscriber.newBuilder(subscriptionName, receiver).build();
            subscriber.addListener(new Subscriber.Listener() {
                @Override
                public void failed(Subscriber.State from, Throwable failure) {
                    log.error("Subscriber failed: {}", failure.toString());
                    ready.countDown();
                }
            }, Runnable::run);

            subscriber.startAsync().awaitRunning();
            log.info("Subscriber running. Press Ctrl+C to exit.");
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                log.info("Shutdown requested. Closing subscriber...");
                subscriber.stopAsync();
            }));

            // Block main thread
            while (subscriber.isRunning()) {
                ready.await(1, TimeUnit.MINUTES);
            }
            log.info("Exited.");
        }
    }

    private static boolean handleLegacyNote(JsonObject root, MidiOut midi) {
        // Legacy NOTE structure from GAS Code.gs
        int channel = getInt(root, "channel", 1);
        String noteStr = getString(root, "note", "C4");
        int velocity = getInt(root, "velocity", 100);
        double durationSec = getDouble(root, "durationSec", 0.5);
        int note = root.get("note").isJsonPrimitive() && root.get("note").getAsJsonPrimitive().isNumber()
                ? root.get("note").getAsInt()
                : NoteUtil.parseNoteName(noteStr);

        log.info("NOTE: ch={}, note={}, vel={}, dur={}s", channel, note, velocity, durationSec);
        midi.noteOn(channel, note, velocity, durationSec);
        return true;
    }

    private static boolean handleEnvelopeNote(JsonObject root, MidiOut midi) {
        // Envelope NOTE.PLAY with payload
        JsonObject payload = root.getAsJsonObject("payload");
        if (payload == null) throw new IllegalArgumentException("Missing payload for NOTE.PLAY");

        int channel = getInt(payload, "channel", 1);
        int note;
        JsonElement n = payload.get("note");
        if (n != null && n.isJsonPrimitive() && n.getAsJsonPrimitive().isNumber()) {
            note = n.getAsInt();
        } else {
            String noteStr = getString(payload, "note", "C4");
            note = NoteUtil.parseNoteName(noteStr);
        }
        int velocity = getInt(payload, "velocity", 100);
        double durationSec = getDouble(payload, "durationSec", 0.5);

        log.info("NOTE.PLAY: ch={}, note={}, vel={}, dur={}s", channel, note, velocity, durationSec);
        midi.noteOn(channel, note, velocity, durationSec);
        return true;
    }

    private static void publishAck(String projectId, String statusTopic, String origin,
                                   String proxyId, boolean ok, String error) {
        try {
            com.google.cloud.pubsub.v1.Publisher publisher =
                    com.google.cloud.pubsub.v1.Publisher.newBuilder(
                            com.google.pubsub.v1.TopicName.of(projectId, statusTopic)
                    ).build();
            JsonObject ack = new JsonObject();
            ack.addProperty("type", "ACK");
            ack.addProperty("origin", origin);
            ack.addProperty("receivedAt", Instant.now().toString());
            ack.addProperty("proxy", proxyId);
            ack.addProperty("ok", ok);
            if (!ok && error != null) ack.addProperty("error", error);

            PubsubMessage message = PubsubMessage.newBuilder()
                    .setData(com.google.protobuf.ByteString.copyFromUtf8(ack.toString()))
                    .build();
            ApiFuture<String> fut = publisher.publish(message);
            ApiFutures.addCallback(fut, new com.google.api.core.ApiFutureCallback<>() {
                @Override public void onFailure(Throwable t) { /* ignore */ }
                @Override public void onSuccess(String messageId) { /* ignore */ }
            }, Runnable::run);
            publisher.shutdown();
        } catch (Exception ex) {
            log.debug("ACK publish failed: {}", ex.toString());
        }
    }

    private static String getenvRequired(String key) {
        String v = System.getenv(key);
        if (v == null || v.isBlank()) {
            throw new IllegalStateException("Missing required env var: " + key);
        }
        return v;
    }

    private static String getString(JsonObject o, String key, String def) {
        return (o.has(key) && o.get(key).isJsonPrimitive()) ? o.get(key).getAsString() : def;
    }
    private static int getInt(JsonObject o, String key, int def) {
        return (o.has(key) && o.get(key).isJsonPrimitive() && o.get(key).getAsJsonPrimitive().isNumber()) ? o.get(key).getAsInt() : def;
    }
    private static double getDouble(JsonObject o, String key, double def) {
        return (o.has(key) && o.get(key).isJsonPrimitive() && o.get(key).getAsJsonPrimitive().isNumber()) ? o.get(key).getAsDouble() : def;
    }

    private static String safeOrigin(String json) {
        try {
            JsonObject obj = gson.fromJson(json, JsonObject.class);
            if (obj != null && obj.has("origin")) return obj.get("origin").getAsString();
        } catch (Exception ignored) {}
        return "";
    }
}
