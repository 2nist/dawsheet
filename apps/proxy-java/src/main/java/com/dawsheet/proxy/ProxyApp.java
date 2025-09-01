package com.dawsheet.proxy;

import static spark.Spark.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.util.*;

public class ProxyApp {
    public static void main(String[] args) throws Exception{
        Path home = Paths.get(System.getProperty("user.home"));
        Path routesFile = home.resolve(".dawsheet_routes.json");
        Path acksFile = home.resolve(".dawsheet_acks.json");
        RoutesManager rm = new RoutesManager(routesFile);
        final ObjectMapper M = new ObjectMapper();
        final java.util.concurrent.atomic.AtomicReference<List<Map<String,Object>>> acksRef = new java.util.concurrent.atomic.AtomicReference<>(new ArrayList<>());
        if (Files.exists(acksFile)){
            try{ acksRef.set(M.readValue(acksFile.toFile(), List.class)); }catch(Exception e){}
        }

    port(8080);
    // Serve static assets from classpath:/public
    staticFileLocation("/public");
        // API key may be set via env DAWSHEET_API_KEY or system property dawsheet.apiKey
        final String apiKey = System.getProperty("dawsheet.apiKey") != null ? System.getProperty("dawsheet.apiKey") : System.getenv("DAWSHEET_API_KEY");
        if (apiKey != null) System.out.println("API key protected endpoints enabled");

        // simple health endpoint
        get("/health", (req, res) -> {
            res.type("application/json");
            return M.writeValueAsString(Map.of("status", "ok", "version", "1"));
        });
    // simple landing page linking to the API UI
    get("/", (req, res) -> {
        res.type("text/html");
        String html = "<!doctype html>\n" +
            "<html><head><meta charset=\"utf-8\"><title>DAWSheet Proxy</title></head><body>\n" +
            "<h1>DAWSheet Proxy</h1>\n" +
            "<p>Available endpoints:</p>\n" +
            "<ul>\n" +
            "  <li><a href=\"/health\">/health</a> — health check</li>\n" +
            "  <li><a href=\"/playback\">/playback</a> — list playback jobs</li>\n" +
            "  <li><a href=\"/acks\">/acks</a> — recent acks</li>\n" +
            "  <li><a href=\"/devices\">/devices</a> — available devices</li>\n" +
            "</ul>\n" +
            "<p>To enqueue: POST JSON to <code>/command</code> with <code>cmd=PLAYBACK.ENQUEUE</code>.</p>\n" +
            "</body></html>\n";
        return html;
    });
    // UI route just redirects to the static UI
    get("/ui", (req, res) -> { res.redirect("/ui/index.html"); return ""; });
        // Server-Sent Events endpoint for lightweight live updates
        get("/events", (req, res) -> {
            res.type("text/event-stream");
            res.header("Cache-Control", "no-cache");
            res.header("Connection", "keep-alive");
            try {
                javax.servlet.ServletOutputStream out = res.raw().getOutputStream();
                String snap = M.writeValueAsString(ProxyServer.listJobs());
                out.write(("event: snapshot\ndata: " + snap + "\n\n").getBytes());
                out.flush();
                Thread t = new Thread(() -> {
                    try {
                        while (true) {
                            Thread.sleep(2000);
                            out.write("event: ping\ndata: {}\n\n".getBytes());
                            out.flush();
                        }
                    } catch (Exception ignored) {}
                });
                t.setDaemon(true);
                t.start();
            } catch (Exception e) {
                // ignore
            }
            return res.raw();
        });
        post("/command", (req, res) -> {
            // simple API key header check when configured
            if (apiKey != null) {
                String got = req.headers("x-api-key");
                if (got == null || !apiKey.equals(got)) {
                    res.status(401);
                    return M.writeValueAsString(Map.of("status","error","msg","unauthorized"));
                }
            }
            Map<String,Object> envelope = M.readValue(req.body(), Map.class);
            Map<String,Object> ack = new ProxyServer().handleCommand(envelope);
            List<Map<String,Object>> acks = acksRef.get();
            acks.add(ack);
            acksRef.set(acks);
            M.writeValue(acksFile.toFile(), acks);
            res.type("application/json");
            return M.writeValueAsString(ack);
        });

        get("/acks", (req, res) -> {
            res.type("application/json");
            return M.writeValueAsString(acksRef.get());
        });
        // Expose available devices
        get("/devices", (req, res) -> {
            res.type("application/json");
            return M.writeValueAsString(io.dawsheet.server.DeviceManager.getAvailableDevices());
        });
        // Playback job status endpoint
        get("/playback/:id", (req, res) -> {
            String id = req.params(":id");
            Map<String,Object> status = ProxyServer.getJobStatus(id);
            res.type("application/json");
            if (status == null) return M.writeValueAsString(Map.of("status","not_found"));
            return M.writeValueAsString(status);
        });
        // List playback jobs (add an `id` alias equal to enqueue_id for client convenience)
        get("/playback", (req, res) -> {
            res.type("application/json");
            java.util.List<java.util.Map<String,Object>> jobs = ProxyServer.listJobs();
            for (java.util.Map<String,Object> j : jobs){
                if (j.containsKey("enqueue_id") && !j.containsKey("id")){
                    j.put("id", j.get("enqueue_id"));
                }
            }
            return M.writeValueAsString(jobs);
        });
        // Cancel playback job
        post("/playback/:id/cancel", (req, res) -> {
            String id = req.params(":id");
            boolean ok = ProxyServer.cancelJob(id);
            res.type("application/json");
            return M.writeValueAsString(Map.of("ok", ok));
        });

        // Prune completed/cancelled/error jobs
        post("/playback/prune", (req, res) -> {
            int removed = ProxyServer.pruneCompleted();
            res.type("application/json");
            return M.writeValueAsString(Map.of("removed", removed));
        });

        // Validate arrangement JSON against schema
        post("/arrangement/validate", (req, res) -> {
            Map<String,Object> arrangement = M.readValue(req.body(), Map.class);
            java.util.List<String> errs = ArrangementValidator.validate(arrangement);
            res.type("application/json");
            return M.writeValueAsString(Map.of(
                "ok", errs.isEmpty(),
                "errors", errs
            ));
        });
    }
}
