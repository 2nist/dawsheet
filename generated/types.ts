export interface Event {
  beat_abs: number;
  time_s: number;
  timecode: string;
  chord: string;
  section: string;
  dur_beats: number;
  dur_s: number;
  lyric: string;
  event_id: string;
}

export interface SongRecord {
  id?: string;
  title?: string;
  artist?: string;
  source?: string;
  project_id?: string;
  events: Event[];
}
