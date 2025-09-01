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
        post("/command", (req, res) -> {
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
        // List playback jobs
        get("/playback", (req, res) -> {
            res.type("application/json");
            return M.writeValueAsString(ProxyServer.listJobs());
        });
        // Cancel playback job
        post("/playback/:id/cancel", (req, res) -> {
            String id = req.params(":id");
            boolean ok = ProxyServer.cancelJob(id);
            res.type("application/json");
            return M.writeValueAsString(Map.of("ok", ok));
        });
    }
}
