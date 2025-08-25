package io.dawsheet.pubsub;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.pubsub.v1.AckReplyConsumer;
import com.google.cloud.pubsub.v1.MessageReceiver;
import com.google.cloud.pubsub.v1.Publisher;
import com.google.cloud.pubsub.v1.Subscriber;
import com.google.pubsub.v1.ProjectSubscriptionName;
import com.google.pubsub.v1.PubsubMessage;
import com.google.pubsub.v1.TopicName;
import io.dawsheet.server.CommandEnvelope;
import io.dawsheet.server.CommandRouter;
import io.dawsheet.server.PubSubStatusPublisher;
import io.dawsheet.server.StatusPublisher;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

public class PubSubClient {

    private final String projectId = System.getenv("GCP_PROJECT_ID");
    private final String subscriptionId = System.getenv("PULL_SUBSCRIPTION");
    private final String statusTopicId = System.getenv("STATUS_TOPIC");

    private Subscriber subscriber;
    private Publisher statusPublisher;
    private CommandRouter router;
    private final ObjectMapper mapper = new ObjectMapper();

    public void start() throws IOException {
        if (projectId == null || subscriptionId == null || statusTopicId == null) {
            throw new IllegalStateException("Required environment variables are not set (GCP_PROJECT_ID, PULL_SUBSCRIPTION, STATUS_TOPIC)");
        }

        TopicName statusTopicName = TopicName.of(projectId, statusTopicId);
        statusPublisher = Publisher.newBuilder(statusTopicName).build();
        StatusPublisher sp = new PubSubStatusPublisher(statusPublisher);

        try {
            router = new CommandRouter("commands.schema.json", sp);
        } catch (Exception e) {
            throw new IOException("Failed to initialize CommandRouter: " + e.getMessage(), e);
        }

        ProjectSubscriptionName subscriptionName = ProjectSubscriptionName.of(projectId, subscriptionId);

        MessageReceiver receiver = (PubsubMessage message, AckReplyConsumer consumer) -> {
            String json = message.getData().toStringUtf8();
            System.out.println("Received message: " + json);
            try {
                CommandEnvelope env = mapper.readValue(json, CommandEnvelope.class);
                router.handle(env);
                consumer.ack();
            } catch (Exception e) {
                System.err.println("Failed to process message: " + e.getMessage());
                e.printStackTrace();
                consumer.nack();
            }
        };

        subscriber = Subscriber.newBuilder(subscriptionName, receiver).build();
        subscriber.startAsync().awaitRunning();
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
