package io.dawsheet.midi;

public final class NoteUtil {
    private NoteUtil() {}

    /**
     * Parse note name like C4, C#4, Db3, A0 into MIDI number (0-127).
     * Uses C4 = 60 convention (middle C).
     */
    public static int parseNoteName(String s) {
        if (s == null || s.isEmpty()) return 60;
        s = s.trim();
        // Extract pitch class and octave
        int len = s.length();
        int i = 0;
        char c0 = Character.toUpperCase(s.charAt(i++));
        int pc;
        switch (c0) {
            case 'C': pc = 0; break;
            case 'D': pc = 2; break;
            case 'E': pc = 4; break;
            case 'F': pc = 5; break;
            case 'G': pc = 7; break;
            case 'A': pc = 9; break;
            case 'B': pc = 11; break;
            default: return 60;
        }
        // Accidental (# or b)
        if (i < len) {
            char acc = s.charAt(i);
            if (acc == '#') { pc += 1; i++; }
            else if (acc == 'b' || acc == 'B') { pc -= 1; i++; }
        }
        // Octave digits (can be negative like -1)
        int sign = 1;
        if (i < len && s.charAt(i) == '-') { sign = -1; i++; }
        int oct = 0; boolean hasOct = false;
        while (i < len && Character.isDigit(s.charAt(i))) {
            hasOct = true;
            oct = oct * 10 + (s.charAt(i) - '0');
            i++;
        }
        if (!hasOct) return 60;
        oct *= sign;

        int midi = (oct + 1) * 12 + pc; // C-1=0 => C4=60
        if (midi < 0) midi = 0;
        if (midi > 127) midi = 127;
        return midi;
    }
}
