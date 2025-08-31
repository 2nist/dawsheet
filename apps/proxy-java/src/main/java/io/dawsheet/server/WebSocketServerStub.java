package io.dawsheet.server;

import org.java_websocket.server.WebSocketServer;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.WebSocket;

import java.net.InetSocketAddress;

/**
 * A stub WebSocket server for future real-time bi-directional communication.
 * For the MVP, it simply acknowledges connections and echoes messages.
 */
public class WebSocketServerStub extends WebSocketServer {

    public WebSocketServerStub(int port) {
        super(new InetSocketAddress(port));
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        String client = conn.getRemoteSocketAddress().getAddress().getHostAddress();
        System.out.println("WebSocket connection opened from: " + client);
        conn.send("Welcome to the DAWSheet Real-time Proxy!");
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        String client = conn.getRemoteSocketAddress().getAddress().getHostAddress();
        System.out.println("WebSocket connection closed: " + client + " (code: " + code + ")");
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        System.out.println("Received WebSocket message: " + message);
        // For the MVP, we just echo the message back to the client.
        conn.send("ECHO: " + message);
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        System.err.println("An error occurred on a WebSocket connection: " + ex.getMessage());
        ex.printStackTrace();
    }

    @Override
    public void onStart() {
        System.out.println("WebSocket server has started successfully.");
        setConnectionLostTimeout(100);
    }
}
