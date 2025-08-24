package com.dawsheet.bridge;
import javax.sound.midi.*;

public class MidiOut {
  private Synthesizer synth; private MidiChannel[] channels;

  public MidiOut(){
    try{
      synth=MidiSystem.getSynthesizer();
      synth.open();
      channels=synth.getChannels();
      System.out.println("MidiOut: Default synthesizer opened.");
    }catch(Exception e){
      System.err.println("MidiOut: Failed to open default synth: "+e);
    }
  }
  public void noteOn(int ch,int note,int vel){
    if(channels!=null && ch>=0 && ch<channels.length) channels[ch].noteOn(note, vel);
  }
  public void noteOff(int ch,int note){
    if(channels!=null && ch>=0 && ch<channels.length) channels[ch].noteOff(note, 0);
  }
}
