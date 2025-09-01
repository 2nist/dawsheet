package com.dawsheet.proxy;

import static org.junit.jupiter.api.Assertions.*;

import java.io.File;
import java.nio.file.Files;
import java.util.*;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class ProxyServerPlaybackTest {

    private File tempJobsFile;

    @BeforeEach
    public void setup() throws Exception {
        // create a temp jobs file and point the server at it
        tempJobsFile = Files.createTempFile("dawsheet_jobs_test", ".json").toFile();
        System.setProperty("dawsheet.jobsFile", tempJobsFile.getAbsolutePath());
    }

    @AfterEach
    public void teardown() throws Exception {
        try { Files.deleteIfExists(tempJobsFile.toPath()); } catch(Exception e) {}
        System.clearProperty("dawsheet.jobsFile");
    }

    @Test
    public void testEnqueueAckAndCompletion() throws Exception {
        ProxyServer server = new ProxyServer();
        Map<String,Object> body = new HashMap<>();
        body.put("device_id", "dev-test");
        List<Map<String,Object>> cmds = new ArrayList<>();
        Map<String,Object> cmd = new HashMap<>();
        cmd.put("type", "NOTE.PLAY");
        cmds.add(cmd);
        body.put("commands", cmds);
        body.put("intervalMs", 10);

        Map<String,Object> envelope = new HashMap<>();
        envelope.put("cmd", "PLAYBACK.ENQUEUE");
        envelope.put("id", UUID.randomUUID().toString());
        envelope.put("body", body);

        Map<String,Object> ack = server.handleCommand(envelope);
        assertNotNull(ack, "ack should not be null");
        assertEquals("enqueued", String.valueOf(ack.get("status")));
        String enqueueId = (String) ack.get("enqueue_id");
        assertNotNull(enqueueId);

        // wait for job to complete (timeout 10s)
        long deadline = System.currentTimeMillis() + 10000;
        Map<String,Object> job = null;
        while (System.currentTimeMillis() < deadline) {
            job = ProxyServer.getJobStatus(enqueueId);
            if (job != null) {
                String st = String.valueOf(job.getOrDefault("status",""));
                if ("done".equals(st) || "error".equals(st) || "cancelled".equals(st)) break;
            }
            Thread.sleep(200);
        }
        assertNotNull(job, "job should exist");
        String finalStatus = String.valueOf(job.getOrDefault("status",""));
        assertEquals("done", finalStatus);
    }

    @Test
    public void testCancelRequested() throws Exception {
        ProxyServer server = new ProxyServer();
        Map<String,Object> body = new HashMap<>();
        body.put("device_id", "dev-test");
        List<Map<String,Object>> cmds = new ArrayList<>();
        // make many steps so we can cancel while running
        for (int i = 0; i < 50; i++) {
            Map<String,Object> cmd = new HashMap<>();
            cmd.put("type", "NOTE.PLAY");
            cmds.add(cmd);
        }
        body.put("commands", cmds);
        body.put("intervalMs", 50);

        Map<String,Object> envelope = new HashMap<>();
        envelope.put("cmd", "PLAYBACK.ENQUEUE");
        envelope.put("id", UUID.randomUUID().toString());
        envelope.put("body", body);

        Map<String,Object> ack = server.handleCommand(envelope);
        assertNotNull(ack);
        String enqueueId = (String) ack.get("enqueue_id");
        assertNotNull(enqueueId);

        // request cancel immediately
        boolean ok = ProxyServer.cancelJob(enqueueId);
        assertTrue(ok, "cancelJob should return true");

        // wait for job to reach cancelled
        long deadline = System.currentTimeMillis() + 10000;
        Map<String,Object> job = null;
        while (System.currentTimeMillis() < deadline) {
            job = ProxyServer.getJobStatus(enqueueId);
            if (job != null) {
                String st = String.valueOf(job.getOrDefault("status",""));
                if ("cancelled".equals(st) || "done".equals(st) || "error".equals(st)) break;
            }
            Thread.sleep(200);
        }
        assertNotNull(job);
        String finalStatus = String.valueOf(job.getOrDefault("status",""));
    assertTrue("cancelled".equals(finalStatus) || "done".equals(finalStatus), "final status should be cancelled or done");
    }
}
