package io.dawsheet.server;

import java.util.*;

public class DeviceManager {
    public static List<Map<String,String>> getAvailableDevices(){
        List<Map<String,String>> out = new ArrayList<>();
        Map<String,String> d1 = new HashMap<>();
        d1.put("id","dev-1"); d1.put("name","MIDI Device 1"); d1.put("type","midi");
        Map<String,String> d2 = new HashMap<>();
        d2.put("id","dev-2"); d2.put("name","OSC Device 1"); d2.put("type","osc");
        out.add(d1); out.add(d2);
        return out;
    }
}
