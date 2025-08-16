package io.dawsheet;

import io.dawsheet.server.WebSocketServerStub;
import io.dawsheet.midi.MidiOut;
import io.dawsheet.pubsub.PubSubClient;

import java.util.concurrent.CountDownLatch;

public class App {
    public static void main(String[] args) {
        System.out.println("Starting DAWSheet Proxy...");

        try {
            // Initialize MIDI system
            MidiOut.init();

            // Start WebSocket server (stub)
            WebSocketServerStub server = new WebSocketServerStub(8787);
            server.start();
            System.out.println("WebSocket server started on ws://localhost:8787");

            // Start Pub/Sub client
            PubSubClient pubSubClient = new PubSubClient();
            pubSubClient.start();
            System.out.println("Pub/Sub client started. Listening for messages...");

            // Keep the application running
            final CountDownLatch latch = new CountDownLatch(1);
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                System.out.println("Shutting down...");
                try {
                    server.stop();
                } catch (Exception e) {
                    System.err.println("Error stopping WebSocket server: " + e.getMessage());
                }
                pubSubClient.stop();
                MidiOut.close();
                latch.countDown();
            }));
            latch.await();

        } catch (Exception e) {
            System.err.println("Application failed to start: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
