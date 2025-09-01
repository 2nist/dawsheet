import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import com.dawsheet.proxy.ProxyServer;
import java.util.*;

public class ProxyServerPlaybackEnqueueTest {
    @Test
    public void testPlaybackEnqueueAck() {
        ProxyServer ps = new ProxyServer();
        Map<String,Object> env = new HashMap<>();
        env.put("cmd", "PLAYBACK.ENQUEUE");
        env.put("id", "test-id-123");
        Map<String,Object> body = new HashMap<>();
        body.put("device_id", "dev-1");
        body.put("commands", Arrays.asList(Collections.singletonMap("type","NOTE.PLAY")));
        env.put("body", body);
        Map<String,Object> ack = ps.handleCommand(env);
        assertNotNull(ack);
        assertEquals("enqueued", ack.get("status"));
        assertNotNull(ack.get("enqueue_id"));
    }
}
