package com.dawsheet.proxy;

import com.illposed.osc.*;
import com.illposed.osc.transport.OSCPortOut;
import java.net.InetAddress;

/** Simple OSC client for REAPER control surface. */
public class ReaperOscClient {
    private final String host;
    private final int port;
    private OSCPortOut out;
    private final boolean dryRun;

    public ReaperOscClient(String host, int port) {
        this.host = host;
        this.port = port;
        String dr = System.getProperty("dawsheet.reaper.dryRun");
        if (dr == null || dr.isBlank()) dr = System.getenv().getOrDefault("REAPER_OSC_DRY_RUN", "false");
        this.dryRun = "1".equals(dr) || "true".equalsIgnoreCase(dr);
        try {
            if (!dryRun) {
                this.out = new OSCPortOut(InetAddress.getByName(host), port);
            }
        } catch (Exception e) {
            System.err.println("ReaperOscClient init failed: " + e);
        }
    }

    private synchronized void send(String address, Object... args) {
        try {
            OSCMessage msg = new OSCMessage(address, java.util.Arrays.asList(args));
            if (dryRun) {
                System.out.println("[REAPER OSC DRY_RUN] " + address + " " + java.util.Arrays.toString(args));
                return;
            }
            if (out == null) {
                this.out = new OSCPortOut(InetAddress.getByName(host), port);
            }
            out.send(msg);
        } catch (Exception e) {
            System.err.println("OSC send failed (" + address + "): " + e);
        }
    }

    public void play() { send("/play"); }
    public void stop() { send("/stop"); }
    public void gotoMarkerIndex(int idx) { send("/marker/idx", idx); }
    public void gotoMarkerName(String name) { send("/marker/name", name); }
    public void setTimeSeconds(double seconds) { send("/time/seconds", (float) seconds); }
    public void trackMute(int idx, boolean on) { send("/track/" + idx + "/mute", on ? 1 : 0); }
}
