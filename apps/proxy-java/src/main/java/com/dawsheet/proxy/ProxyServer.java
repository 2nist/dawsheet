package com.dawsheet.proxy;

import java.nio.file.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

public class ProxyServer {
    private RoutesManager routesManager;
    // Simple in-memory job store: enqueue_id -> job info
    private static final Map<String, Map<String, Object>> jobStore = new java.util.concurrent.ConcurrentHashMap<>();
    private static final ObjectMapper M = new ObjectMapper();
    private static final Path jobsFile = Paths.get(System.getProperty("user.home")).resolve(".dawsheet_playback_jobs.json");
    // Single worker executor for playback jobs
    private static final java.util.concurrent.ExecutorService worker = java.util.concurrent.Executors.newSingleThreadExecutor();

    public ProxyServer(){
        Path home = Paths.get(System.getProperty("user.home"));
        Path routesFile = home.resolve(".dawsheet_routes.json");
        this.routesManager = new RoutesManager(routesFile);
        System.out.println("Proxy starting; enumerating devices...");
        // load persisted jobs if present
        loadJobsFile();
        // re-enqueue any queued or running jobs so they continue after restart
        for (Map.Entry<String, Map<String,Object>> e : jobStore.entrySet()){
            String id = e.getKey();
            Map<String,Object> job = e.getValue();
            String status = job.containsKey("status") ? String.valueOf(job.get("status")) : "";
            if ("queued".equals(status) || "running".equals(status)){
                // reset to queued and resubmit
                job.put("status", "queued");
                jobStore.put(id, job);
                Map<String,Object> body = new HashMap<>();
                body.put("device_id", job.get("device_id"));
                body.put("commands", job.get("commands"));
                body.put("intervalMs", job.get("intervalMs") != null ? job.get("intervalMs") : 400);
                worker.submit(() -> executePlaybackJob(id, body));
            }
        }
    }

    public Map<String,Object> handleCommand(Map<String,Object> envelope){
        String cmd = (String)envelope.get("cmd");
        String id = (String)envelope.get("id");
        Map<String,Object> body = (Map)envelope.get("body");
        Map<String,Object> ack = new HashMap<>();
        ack.put("ack_id", java.util.UUID.randomUUID().toString());
        ack.put("ts", java.time.Instant.now().toString());
        ack.put("device_id", (body != null && body.get("device_id") != null) ? body.get("device_id") : "");
        try{
            if ("ROUTING.SET".equals(cmd)){
                if (body == null || !body.containsKey("routes")){
                    ack.put("ok", false);
                    ack.put("msg", "invalid body");
                } else {
                    routesManager.apply(body);
                    routesManager.persist();
                    ack.put("status", "ok");
                    ack.put("msg", "routes applied");
                }
            } else if ("TEST.PING".equals(cmd)){
                ack.put("status", "ok");
                ack.put("msg", "pong");
            } else if ("PLAYBACK.ENQUEUE".equals(cmd)){
                // accept a queued playback request and return an enqueue id
                String enqueueId = java.util.UUID.randomUUID().toString();
                ack.put("status", "enqueued");
                ack.put("enqueue_id", enqueueId);
                ack.put("msg", "playback enqueued");
                // persist job minimal info
                Map<String,Object> job = new HashMap<>();
                job.put("enqueue_id", enqueueId);
                job.put("status", "queued");
                job.put("ts", java.time.Instant.now().toString());
                job.put("device_id", ack.get("device_id"));
                job.put("progress", 0);
                job.put("commands_count", (body != null && body.get("commands") instanceof java.util.List) ? ((java.util.List)body.get("commands")).size() : 0);
                // persist the actual commands and interval so we can resume after restart
                job.put("commands", body != null ? body.get("commands") : null);
                job.put("intervalMs", body != null && body.get("intervalMs") != null ? body.get("intervalMs") : 400);
                jobStore.put(enqueueId, job);
                persistJobsFile();
                // schedule worker to execute job asynchronously
                final Map<String,Object> jobBody = new HashMap<>();
                jobBody.put("device_id", body != null ? body.get("device_id") : null);
                jobBody.put("commands", body != null ? body.get("commands") : null);
                jobBody.put("intervalMs", body != null && body.get("intervalMs") != null ? ((Number)body.get("intervalMs")).intValue() : 400);
                worker.submit(() -> executePlaybackJob(enqueueId, jobBody));
            } else if ("NOTE.PLAY".equals(cmd) || "BATCH.COMMANDS".equals(cmd)){
                ack.put("status", "ok");
                ack.put("msg", "commands forwarded");
            } else {
                ack.put("status", "error");
                ack.put("msg", "unknown cmd");
            }
        }catch(Exception e){
            ack.put("status", "error");
            ack.put("msg", e.toString());
        }
        return ack;
    }

    // Worker: execute commands sequentially with intervalMs between steps.
    private void executePlaybackJob(String enqueueId, Map<String,Object> body){
        Map<String,Object> job = jobStore.get(enqueueId);
        if (job == null) return;
        // check if job was cancelled while queued
        String current = String.valueOf(job.getOrDefault("status", ""));
        if ("cancelled".equals(current) || "cancelling".equals(current)){
            job.put("status", "cancelled");
            jobStore.put(enqueueId, job);
            persistJobsFile();
            return;
        }
        job.put("status", "running");
        try{
            java.util.List cmds = (java.util.List) body.get("commands");
            int interval = body.get("intervalMs") instanceof Number ? ((Number)body.get("intervalMs")).intValue() : 400;
            int total = cmds == null ? 0 : cmds.size();
            io.dawsheet.server.CommandRouter router = new io.dawsheet.server.CommandRouter("commands.schema.json", io.dawsheet.server.StatusPublisher.noop());
            for (int i = 0; i < total; i++){
                // check cancellation request
                Map<String,Object> jnow = jobStore.get(enqueueId);
                String st = jnow != null ? String.valueOf(jnow.getOrDefault("status","")) : "";
                if ("cancelling".equals(st) || "cancelled".equals(st)){
                    jnow.put("status", "cancelled");
                    jnow.put("cancelled_at_step", i);
                    jobStore.put(enqueueId, jnow);
                    persistJobsFile();
                    return;
                }
                Object raw = cmds.get(i);
                // attempt to coerce into CommandEnvelope-like map and call router.handle via a simple envelope
                if (raw instanceof java.util.Map){
                    java.util.Map map = (java.util.Map) raw;
                    // Build a CommandEnvelope-like wrapper
                    io.dawsheet.server.CommandEnvelope env = new io.dawsheet.server.CommandEnvelope();
                    env.v = 1;
                    env.type = map.containsKey("type") ? String.valueOf(map.get("type")) : "NOTE.PLAY";
                    env.id = java.util.UUID.randomUUID().toString();
                    env.origin = map.containsKey("origin") ? String.valueOf(map.get("origin")) : "proxy:enqueue:"+enqueueId;
                    env.at = "now";
                    env.target = body.get("device_id") != null ? String.valueOf(body.get("device_id")) : "";
                    env.payload = map;
                    // handle command
                    router.handle(env);
                }
                job.put("progress", Math.round(((i+1)*100.0f)/Math.max(1, total)));
                // simple status writeback and persist
                jobStore.put(enqueueId, job);
                persistJobsFile();
                try { Thread.sleep(Math.max(0, interval)); } catch (InterruptedException ie) { /* ignore */ }
            }
            job.put("status", "done");
            job.put("completed_ts", java.time.Instant.now().toString());
            persistJobsFile();
        }catch(Exception e){
            job.put("status", "error");
            job.put("error", e.toString());
            persistJobsFile();
        }finally{
            jobStore.put(enqueueId, job);
        }
    }

    // Expose job lookup for status endpoint
    public static Map<String,Object> getJobStatus(String enqueueId){
        return jobStore.get(enqueueId);
    }

    // Return shallow copy of jobs map for listing
    public static List<Map<String,Object>> listJobs(){
        List<Map<String,Object>> out = new ArrayList<>();
        for (Map.Entry<String, Map<String,Object>> e : jobStore.entrySet()){
            out.add(new HashMap<>(e.getValue()));
        }
        return out;
    }

    // Cancel a job: if queued, mark cancelled; if running, set status to cancelling (best-effort)
    public static synchronized boolean cancelJob(String enqueueId){
        Map<String,Object> job = jobStore.get(enqueueId);
        if (job == null) return false;
        String status = String.valueOf(job.getOrDefault("status", ""));
        if ("done".equals(status) || "error".equals(status) || "cancelled".equals(status)) return false;
        if ("queued".equals(status)){
            job.put("status", "cancelled");
            job.put("cancelled_ts", java.time.Instant.now().toString());
            jobStore.put(enqueueId, job);
            persistJobsFile();
            return true;
        }
        // if running, mark as cancelling; the worker periodically checks this flag
        job.put("status", "cancelling");
        job.put("cancelled_ts", java.time.Instant.now().toString());
        jobStore.put(enqueueId, job);
        persistJobsFile();
        return true;
    }

    // Persist jobStore to jobsFile atomically
    private static synchronized void persistJobsFile(){
        try{
            Path tmp = jobsFile.resolveSibling(jobsFile.getFileName().toString()+".tmp");
            M.writeValue(tmp.toFile(), jobStore);
            try { Files.move(tmp, jobsFile, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE); } catch(Exception mv){ Files.move(tmp, jobsFile, StandardCopyOption.REPLACE_EXISTING); }
        }catch(Exception e){
            System.err.println("Failed to persist jobs file: " + e);
        }
    }

    // Load persisted jobs into jobStore
    private static synchronized void loadJobsFile(){
        try{
            if (!Files.exists(jobsFile)) return;
            Map<String, Map<String,Object>> loaded = M.readValue(jobsFile.toFile(), new TypeReference<Map<String, Map<String,Object>>>(){});
            if (loaded != null) jobStore.putAll(loaded);
        }catch(Exception e){
            System.err.println("Failed to load jobs file: " + e);
        }
    }
}
