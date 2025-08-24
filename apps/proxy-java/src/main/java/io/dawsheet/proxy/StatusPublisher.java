package io.dawsheet.proxy;

import com.google.api.core.ApiFuture;
import com.google.cloud.pubsub.v1.Publisher;
import com.google.protobuf.ByteString;
import com.google.pubsub.v1.ProjectTopicName;
import com.google.pubsub.v1.PubsubMessage;

import java.nio.charset.StandardCharsets;

public class StatusPublisher implements AutoCloseable {
  private final Publisher publisher;

  public StatusPublisher(String projectId, String topic) throws Exception {
    this.publisher = Publisher.newBuilder(ProjectTopicName.of(projectId, topic)).build();
  }

  public void publishJson(String json) {
    try {
      PubsubMessage msg = PubsubMessage.newBuilder()
          .setData(ByteString.copyFrom(json, StandardCharsets.UTF_8))
          .build();
      ApiFuture<String> id = publisher.publish(msg);
      id.get();
    } catch (Exception e) {
      System.err.println("Status publish failed: " + e.getMessage());
    }
  }

  @Override public void close() throws Exception {
    if (publisher != null) publisher.shutdown();
  }
}
