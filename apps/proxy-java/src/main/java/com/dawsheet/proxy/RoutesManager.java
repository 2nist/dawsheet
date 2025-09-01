package com.dawsheet.proxy;

import java.io.*;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;

public class RoutesManager {
    private static final ObjectMapper M = new ObjectMapper();
    private Map<String,Object> routes = new HashMap<>();
    private Path persistPath;

    public RoutesManager(Path persistPath){
        this.persistPath = persistPath;
        load();
    }

    @SuppressWarnings("unchecked")
    public synchronized void load(){
        try{
            if (Files.exists(persistPath)){
                routes = M.readValue(persistPath.toFile(), Map.class);
                System.out.println("Loaded routes from " + persistPath);
            }
        }catch(Exception e){
            System.err.println("Failed to load routes: " + e);
        }
    }

    public synchronized void apply(Map<String,Object> newRoutes){
        this.routes = newRoutes;
    }

    public synchronized void persist(){
        try{
            Path tmp = persistPath.resolveSibling(persistPath.getFileName().toString()+".tmp");
            M.writeValue(tmp.toFile(), routes);
            Files.move(tmp, persistPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            System.out.println("Persisted routes to " + persistPath);
        }catch(Exception e){
            System.err.println("Failed to persist routes: " + e);
        }
    }

    public synchronized Map<String,Object> getRoutes(){ return routes; }
}
