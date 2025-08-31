package io.dawsheet.osc;

import com.illposed.osc.OSCMessage;
import com.illposed.osc.transport.OSCPortOut;

import java.net.InetAddress;
import java.util.Arrays;

/**
 * A stub class for future OSC (Open Sound Control) routing.
 * This demonstrates the structure for sending OSC messages but is not
 * actively used in the MVP.
 */
public class OscRouter {

    private OSCPortOut sender;

    public OscRouter(String host, int port) {
        try {
            this.sender = new OSCPortOut(InetAddress.getByName(host), port);
        } catch (Exception e) {
            System.err.println("Failed to create OSC sender: " + e.getMessage());
        }
    }

    public void send(String address, Object... args) {
        if (sender == null) return;

        OSCMessage msg = new OSCMessage(address, Arrays.asList(args));
        try {
            sender.send(msg);
        } catch (Exception e) {
            System.err.println("Failed to send OSC message: " + e.getMessage());
        }
    }

    public void close() {
        if (sender != null) {
            try {
                sender.close();
            } catch (Exception e) {
                System.err.println("Failed to close OSC sender: " + e.getMessage());
            }
        }
    }
}
