package com.dawsheet.bridge;
import com.google.gson.*;
import org.java_websocket.server.WebSocketServer;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import javax.sound.midi.*;
import java.net.InetSocketAddress;
import java.util.concurrent.*;

public class BridgeServer extends WebSocketServer {
  private final ScheduledExecutorService sched = Executors.newScheduledThreadPool(1);
  private final MidiOut midi = new MidiOut();
  private final int lookaheadMs = 100;

  public BridgeServer(int port){
    super(new InetSocketAddress("127.0.0.1", port));
    setReuseAddr(true);
  }

  @Override public void onOpen(WebSocket c, ClientHandshake h){
    c.send("{\"type\":\"HELLO_ACK\"}");
    System.out.println("Client connected: "+c.getRemoteSocketAddress());
  }
  @Override public void onClose(WebSocket c,int code,String reason,boolean remote){
    System.out.println("Client disconnected.");
  }
  @Override public void onMessage(WebSocket c,String msg){
    try{
      JsonElement root=JsonParser.parseString(msg);
      if(root.isJsonObject()){
        JsonObject o=root.getAsJsonObject();
        String type=o.has("type")?o.get("type").getAsString():"";
        if("PING".equals(type)){ c.send("{\"type\":\"PONG\",\"ts\":"+System.currentTimeMillis()+"}"); return; }
        if("HELLO".equals(type)){ c.send("{\"type\":\"HELLO_ACK\"}"); return; }
        if("NOTE.PLAY".equals(type)){ scheduleNote(o.getAsJsonObject("payload")); return; }
      }
      if(root.isJsonArray()){
        for(JsonElement el: root.getAsJsonArray()){
          if(!el.isJsonObject()) continue;
          JsonObject env=el.getAsJsonObject();
          String type=env.get("type").getAsString();
          if("NOTE.PLAY".equals(type)) scheduleNote(env.getAsJsonObject("payload"));
        }
      }
    }catch(Exception e){ System.err.println("onMessage error: "+e); }
  }

  private void scheduleNote(JsonObject payload){
    int note=noteToNumber(payload.get("note"));
    int vel=payload.has("velocity")?payload.get("velocity").getAsInt():100;
    int ch=payload.has("channel")?payload.get("channel").getAsInt()-1:0;
    double durSec=payload.has("durationSec")?payload.get("durationSec").getAsDouble():0.2;

    sched.schedule(()->midi.noteOn(ch,note,vel), lookaheadMs, TimeUnit.MILLISECONDS);
    sched.schedule(()->midi.noteOff(ch,note), (long)(lookaheadMs+durSec*1000), TimeUnit.MILLISECONDS);
  }

  private int noteToNumber(JsonElement n){
    if(n==null) return 60;
    if(n.isJsonPrimitive()){
      JsonPrimitive p=n.getAsJsonPrimitive();
      if(p.isNumber()) return Math.max(0, Math.min(127, p.getAsInt()));
      if(p.isString()) return noteNameToMidi(p.getAsString());
    }
    return 60;
  }

  private int noteNameToMidi(String s){
    String[] names={"C","C#","D","D#","E","F","F#","G","G#","A","A#","B"};
    s=s.trim().toUpperCase().replaceAll("\\s+","");
    int octave=4;
    String name=s;
    for(int i=s.length()-1;i>=0;i--){
      if(Character.isDigit(s.charAt(i))||s.charAt(i)=='-'){ name=s.substring(0,i); octave=Integer.parseInt(s.substring(i)); break; }
    }
    int idx=-1;
    for(int i=0;i<names.length;i++) if(name.equals(names[i])) idx=i;
    if(idx<0) idx=0;
    return (octave+1)*12+idx;
  }

  @Override public void onError(WebSocket c, Exception ex){ ex.printStackTrace(); }
  @Override public void onStart(){ System.out.println("BridgeServer started on ws://127.0.0.1:"+getPort()); }

  public static void main(String[] args) throws Exception {
    BridgeServer s=new BridgeServer(17653);
    s.start();
    Runtime.getRuntime().addShutdownHook(new Thread(()->{ try{ s.stop(1000);}catch(Exception ignored){} }));
  }
}
