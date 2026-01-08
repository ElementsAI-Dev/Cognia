/**
 * Tests for Subtitle Parser
 */

import {
  detectFormat,
  parseSubtitle,
  cuesToPlainText,
  cuesToTimestampedText,
  findCueAtTime,
  searchCues,
} from './subtitle-parser';

describe('Subtitle Parser', () => {
  describe('detectFormat', () => {
    it('should detect SRT format', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello, world!

2
00:00:05,000 --> 00:00:08,000
This is a test.`;
      
      expect(detectFormat(srtContent)).toBe('srt');
    });

    it('should detect VTT format', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello, world!

00:00:05.000 --> 00:00:08.000
This is a test.`;
      
      expect(detectFormat(vttContent)).toBe('vtt');
    });

    it('should detect ASS format', () => {
      const assContent = `[Script Info]
ScriptType: v4.00+
Title: Test Subtitle

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,Hello, world!`;
      
      expect(detectFormat(assContent)).toBe('ass');
    });

    it('should return unknown for unrecognized format', () => {
      const unknownContent = 'Just some random text without any format markers';
      expect(detectFormat(unknownContent)).toBe('unknown');
    });
  });

  describe('parseSubtitle - SRT', () => {
    const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello, world!

2
00:00:05,500 --> 00:00:08,250
This is line two.
With multiple lines.

3
00:01:30,000 --> 00:01:35,000
Final subtitle.`;

    it('should parse SRT content correctly', () => {
      const result = parseSubtitle(srtContent, 'en');
      
      expect(result.format).toBe('srt');
      expect(result.tracks.length).toBe(1);
      expect(result.tracks[0].cues.length).toBe(3);
    });

    it('should parse timestamps correctly', () => {
      const result = parseSubtitle(srtContent, 'en');
      const cues = result.tracks[0].cues;
      
      expect(cues[0].startTime).toBe(1000);
      expect(cues[0].endTime).toBe(4000);
      expect(cues[1].startTime).toBe(5500);
      expect(cues[1].endTime).toBe(8250);
      expect(cues[2].startTime).toBe(90000);
      expect(cues[2].endTime).toBe(95000);
    });

    it('should parse text correctly', () => {
      const result = parseSubtitle(srtContent, 'en');
      const cues = result.tracks[0].cues;
      
      expect(cues[0].text).toBe('Hello, world!');
      expect(cues[1].text).toBe('This is line two.\nWith multiple lines.');
      expect(cues[2].text).toBe('Final subtitle.');
    });

    it('should set track properties correctly', () => {
      const result = parseSubtitle(srtContent, 'zh');
      const track = result.tracks[0];
      
      expect(track.language).toBe('zh');
      expect(track.format).toBe('srt');
      expect(track.isDefault).toBe(true);
    });
  });

  describe('parseSubtitle - VTT', () => {
    const vttContent = `WEBVTT - Test Video

cue1
00:00:01.000 --> 00:00:04.000
Hello, world!

cue2
00:05.500 --> 00:08.250
Short format timestamp.

00:01:30.000 --> 00:01:35.000
No cue ID here.`;

    it('should parse VTT content correctly', () => {
      const result = parseSubtitle(vttContent, 'en');
      
      expect(result.format).toBe('vtt');
      expect(result.tracks.length).toBe(1);
      expect(result.tracks[0].cues.length).toBe(3);
    });

    it('should parse VTT timestamps with hours', () => {
      const result = parseSubtitle(vttContent, 'en');
      const cues = result.tracks[0].cues;
      
      expect(cues[0].startTime).toBe(1000);
      expect(cues[0].endTime).toBe(4000);
    });

    it('should extract VTT metadata', () => {
      const result = parseSubtitle(vttContent, 'en');
      expect(result.metadata.title).toBe('Test Video');
    });
  });

  describe('parseSubtitle - ASS', () => {
    const assContent = `[Script Info]
Title: My Subtitle File
Original Script: Test Author
PlayResX: 1920
PlayResY: 1080
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour
Style: Default,Arial,20,&H00FFFFFF

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,Hello, world!
Dialogue: 0,0:00:05.50,0:00:08.25,Default,Speaker1,0,0,0,,This is speaker one.
Dialogue: 0,0:01:30.00,0:01:35.00,Default,,0,0,0,,Text with {\\b1}bold{\\b0} formatting.`;

    it('should parse ASS content correctly', () => {
      const result = parseSubtitle(assContent, 'en');
      
      expect(result.format).toBe('ass');
      expect(result.tracks.length).toBe(1);
      expect(result.tracks[0].cues.length).toBe(3);
    });

    it('should parse ASS timestamps correctly', () => {
      const result = parseSubtitle(assContent, 'en');
      const cues = result.tracks[0].cues;
      
      expect(cues[0].startTime).toBe(1000);
      expect(cues[0].endTime).toBe(4000);
      expect(cues[1].startTime).toBe(5500);
      expect(cues[1].endTime).toBe(8250);
    });

    it('should extract ASS metadata', () => {
      const result = parseSubtitle(assContent, 'en');
      
      expect(result.metadata.title).toBe('My Subtitle File');
      expect(result.metadata.author).toBe('Test Author');
      expect(result.metadata.videoResolution).toEqual({ width: 1920, height: 1080 });
    });

    it('should clean ASS formatting tags', () => {
      const result = parseSubtitle(assContent, 'en');
      const cues = result.tracks[0].cues;
      
      expect(cues[2].text).toBe('Text with bold formatting.');
    });

    it('should extract speaker names', () => {
      const result = parseSubtitle(assContent, 'en');
      const cues = result.tracks[0].cues;
      
      expect(cues[1].speaker).toBe('Speaker1');
    });
  });

  describe('cuesToPlainText', () => {
    it('should convert cues to plain text', () => {
      const cues = [
        { id: '1', index: 1, startTime: 0, endTime: 1000, text: 'Hello' },
        { id: '2', index: 2, startTime: 1000, endTime: 2000, text: 'World' },
      ];
      
      expect(cuesToPlainText(cues)).toBe('Hello World');
    });

    it('should handle empty cues array', () => {
      expect(cuesToPlainText([])).toBe('');
    });
  });

  describe('cuesToTimestampedText', () => {
    it('should convert cues to timestamped text', () => {
      const cues = [
        { id: '1', index: 1, startTime: 0, endTime: 5000, text: 'First line' },
        { id: '2', index: 2, startTime: 65000, endTime: 70000, text: 'Second line' },
      ];
      
      const result = cuesToTimestampedText(cues);
      
      expect(result).toContain('[0:00]');
      expect(result).toContain('[1:05]');
      expect(result).toContain('First line');
      expect(result).toContain('Second line');
    });
  });

  describe('findCueAtTime', () => {
    const cues = [
      { id: '1', index: 1, startTime: 0, endTime: 5000, text: 'First' },
      { id: '2', index: 2, startTime: 5000, endTime: 10000, text: 'Second' },
      { id: '3', index: 3, startTime: 15000, endTime: 20000, text: 'Third' },
    ];

    it('should find cue at specific time', () => {
      expect(findCueAtTime(cues, 2500)?.text).toBe('First');
      expect(findCueAtTime(cues, 7000)?.text).toBe('Second');
      expect(findCueAtTime(cues, 17000)?.text).toBe('Third');
    });

    it('should return undefined for time without cue', () => {
      expect(findCueAtTime(cues, 12000)).toBeUndefined();
    });
  });

  describe('searchCues', () => {
    const cues = [
      { id: '1', index: 1, startTime: 0, endTime: 5000, text: 'Hello world' },
      { id: '2', index: 2, startTime: 5000, endTime: 10000, text: 'Goodbye world' },
      { id: '3', index: 3, startTime: 10000, endTime: 15000, text: 'Hello again' },
    ];

    it('should find cues containing query', () => {
      const results = searchCues(cues, 'hello');
      expect(results.length).toBe(2);
    });

    it('should be case insensitive', () => {
      const results = searchCues(cues, 'WORLD');
      expect(results.length).toBe(2);
    });

    it('should return empty array for no matches', () => {
      const results = searchCues(cues, 'xyz');
      expect(results.length).toBe(0);
    });
  });
});
