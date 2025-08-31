package io.dawsheet.pubsub;

import com.google.cloud.pubsub.v1.AckReplyConsumer;
import com.google.cloud.pubsub.v1.MessageReceiver;
import com.google.cloud.pubsub.v1.Subscriber;
import com.google.cloud.pubsub.v1.Publisher;
import com.google.gson.Gson;
import com.google.protobuf.ByteString;
import com.google.pubsub.v1.ProjectSubscriptionName;
import com.google.pubsub.v1.PubsubMessage;
import com.google.pubsub.v1.TopicName;
import io.dawsheet.midi.MidiOut;
import io.dawsheet.parser.NoteParser;
import io.dawsheet.schema.AckStatus;
import io.dawsheet.schema.NoteCommand;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

public class PubSubClient {

    private final String projectId = System.getenv("GCP_PROJECT_ID");
    private final String subscriptionId = System.getenv("PULL_SUBSCRIPTION");
    private final String statusTopicId = System.getenv("STATUS_TOPIC");

    private Subscriber subscriber;
    private Publisher statusPublisher;
    private final Gson gson = new Gson();

    public void start() throws IOException {
        if (projectId == null || subscriptionId == null || statusTopicId == null) {
            throw new IllegalStateException("Required environment variables are not set (GCP_PROJECT_ID, PULL_SUBSCRIPTION, STATUS_TOPIC)");
        }

        ProjectSubscriptionName subscriptionName = ProjectSubscriptionName.of(projectId, subscriptionId);
        
        MessageReceiver receiver = (PubsubMessage message, AckReplyConsumer consumer) -> {
            String json = message.getData().toStringUtf8();
            System.out.println("Received message: " + json);

            String origin = null;
            try {
                NoteCommand command = NoteParser.parse(json);
                origin = command.origin; // Keep origin for ACK
                int midiNote = NoteParser.noteToMidi(command.note); // Convert note name to MIDI number
                try (MidiOut midiOut = new MidiOut()) {
                    midiOut.noteOn(command.channel, midiNote, command.velocity, command.durationSec);
                }
                publishAck(origin, true, null);
                consumer.ack();
            } catch (Exception e) {
                System.err.println("Failed to process message: " + e.getMessage());
                e.printStackTrace();
                if (origin == null) {
                    origin = getOriginFromJson(json); // Attempt to get origin for error reporting
                }
                if (origin != null) {
                    publishAck(origin, false, e.getMessage());
                }
                consumer.nack();
            }
        };

        subscriber = Subscriber.newBuilder(subscriptionName, receiver).build();
        subscriber.startAsync().awaitRunning();

        TopicName statusTopicName = TopicName.of(projectId, statusTopicId);
        statusPublisher = Publisher.newBuilder(statusTopicName).build();
    }

    private void publishAck(String origin, boolean ok, String error) {
        try {
            AckStatus status = new AckStatus();
            status.type = "ACK";
            status.origin = origin;
            status.receivedAt = Instant.now().toString();
            status.proxy = "java-rt-bridge@" + java.net.InetAddress.getLocalHost().getHostName();
            status.ok = ok;
            if (error != null) {
                status.error = error;
            }

            String jsonStatus = gson.toJson(status);
            ByteString data = ByteString.copyFromUtf8(jsonStatus);
            PubsubMessage pubsubMessage = PubsubMessage.newBuilder().setData(data).build();

            statusPublisher.publish(pubsubMessage);
            System.out.println("Published ACK: " + jsonStatus);
        } catch (Exception e) {
            System.err.println("Failed to publish ACK: " + e.getMessage());
        }
    }

    private String getOriginFromJson(String json) {
        try {
            NoteCommand command = gson.fromJson(json, NoteCommand.class);
            return command.origin;
        } catch (Exception e) {
            return "unknown-origin";
        }
    }

    public void stop() {
        if (subscriber != null) {
            subscriber.stopAsync().awaitTerminated();
        }
        if (statusPublisher != null) {
            try {
                statusPublisher.shutdown();
                statusPublisher.awaitTermination(1, TimeUnit.MINUTES);
            } catch (InterruptedException e) {
                System.err.println("Publisher shutdown interrupted.");
            }
        }
    }
}
