package io.dawsheet.server;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;

public class DeviceManagerTest {
    @Test
    public void testGetAvailableDevices() {
        List<Map<String,String>> devs = DeviceManager.getAvailableDevices();
        assertNotNull(devs);
        assertTrue(devs.size() >= 1);
        assertTrue(devs.get(0).containsKey("id"));
    }
}
