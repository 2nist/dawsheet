package io.dawsheet.server;

import com.dawsheet.proxy.ProxyServer;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;

public class ProxyServerTest {
    @Test
    public void testPingAck() throws Exception {
        ProxyServer ps = new ProxyServer();
        Map<String,Object> env = new HashMap<>();
        env.put("cmd", "TEST.PING");
        env.put("id", "t1");
        env.put("body", Map.of("device_id","dev-1"));
        Map<String,Object> ack = ps.handleCommand(env);
        assertEquals("ok", ack.get("status"));
        assertTrue(ack.containsKey("ack_id"));
    }

    @Test
    public void testBatchCommandsAck() throws Exception {
        ProxyServer ps = new ProxyServer();
        Map<String,Object> env = new HashMap<>();
        env.put("cmd", "BATCH.COMMANDS");
        env.put("id", "b1");
        env.put("body", Map.of("device_id","dev-1","commands", List.of(Map.of("type","NOTE.PLAY","at","bar:1:1"))));
        Map<String,Object> ack = ps.handleCommand(env);
        assertEquals("ok", ack.get("status"));
        assertTrue(ack.containsKey("ack_id"));
    }
}
