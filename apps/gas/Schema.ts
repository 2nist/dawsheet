/**
 * This file defines the TypeScript interfaces for the JSON schemas used in Pub/Sub messages.
 * It is used for documentation and development purposes (e.g., in the Java proxy)
 * but is not directly used by the Google Apps Script code, which is JavaScript.
 */

/**
 * Schema for messages sent to the `dawsheet.commands` topic.
 * Represents a command to be executed by a proxy.
 */
export interface NoteCommand {
  /** The type of the command, e.g., "NOTE". */
  type: "NOTE";

  /** An identifier for the song or session. */
  songId: string;

  /** The MIDI channel (1-16). */
  channel: number;

  /** The note name, e.g., "C4", "F#3". */
  note: string;

  /** The MIDI velocity (1-127). */
  velocity: number;

  /** The duration of the note in seconds. */
  durationSec: number;

  /** The origin of the command, e.g., "sheets://Grid/A5". */
  origin: string;
}

/**
 * Schema for messages sent to the `dawsheet.status` topic.
 * Represents an acknowledgment or status update from a proxy.
 */
export interface AckStatus {
  /** The type of the status message, e.g., "ACK". */
  type: "ACK";

  /** The origin of the command that this status is for. */
  origin: string;

  /** The ISO 8601 timestamp when the message was received by the proxy. */
  receivedAt: string;

  /** An identifier for the proxy that processed the command. */
  proxy: string;

  /** A boolean indicating if the command was processed successfully. */
  ok: boolean;

  /** An optional error message if `ok` is false. */
  error?: string;
}
