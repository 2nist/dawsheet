package io.dawsheet.parser;

import com.google.gson.Gson;
import io.dawsheet.schema.NoteCommand;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class NoteParser {

    private static final Gson gson = new Gson();
    private static final Map<String, Integer> noteValues = new HashMap<>();
    private static final Pattern notePattern = Pattern.compile("([A-G])([#B]?)(-?[0-9])");


    static {
        noteValues.put("C", 0);
        noteValues.put("D", 2);
        noteValues.put("E", 4);
        noteValues.put("F", 5);
        noteValues.put("G", 7);
        noteValues.put("A", 9);
        noteValues.put("B", 11);
    }

    public static NoteCommand parse(String json) {
        NoteCommand command = gson.fromJson(json, NoteCommand.class);
        if (command == null || command.note == null) {
            throw new IllegalArgumentException("Invalid command JSON or missing note field.");
        }
        return command;
    }

    public static int noteToMidi(String noteName) {
        Matcher matcher = notePattern.matcher(noteName.toUpperCase());
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Invalid note format: " + noteName);
        }

        String pitch = matcher.group(1);
        String accidental = matcher.group(2);
        int octave = Integer.parseInt(matcher.group(3));

        int midiValue = noteValues.get(pitch);

        if (accidental.equals("#")) {
            midiValue++;
        } else if (accidental.equals("B")) {
            midiValue--;
        }

        return midiValue + (octave + 1) * 12;
    }
}
