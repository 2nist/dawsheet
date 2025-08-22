package io.dawsheet.midi;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class NoteUtilTest {
    @Test
    public void testMiddleC() {
        assertEquals(60, NoteUtil.parseNoteName("C4"));
        assertEquals(61, NoteUtil.parseNoteName("C#4"));
        assertEquals(59, NoteUtil.parseNoteName("B3"));
        assertEquals(58, NoteUtil.parseNoteName("Bb3"));
    }

    @Test
    public void testBounds() {
        assertEquals(0, NoteUtil.parseNoteName("C-1"));
        assertEquals(127, NoteUtil.parseNoteName("G9"));
    }
}
