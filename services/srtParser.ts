import { Subtitle } from '../types';

// Helper to convert SRT time string (00:00:00,000) to seconds
const srtTimeToSeconds = (timeString: string): number => {
  if (!timeString) return 0;
  const parts = timeString.replace(',', '.').split(':');
  if (parts.length < 3) return 0;
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
};

interface ParsedSRTItem {
  id: string;
  start: number;
  end: number;
  text: string;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const parseSingleSRT = (srtContent: string): ParsedSRTItem[] => {
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split('\n\n');
  
  const items: ParsedSRTItem[] = [];

  blocks.forEach(block => {
    const lines = block.split('\n').filter(line => line.trim() !== '');
    if (lines.length >= 3) {
      // Line 1: Index (ignored mostly, we regenerate IDs)
      // Line 2: Timecode
      const timeLine = lines[1];
      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,.]\d{3})/);
      
      if (timeMatch) {
        // Line 3+: Text
        const text = lines.slice(2).join(' ').replace(/<[^>]*>/g, ''); // Join multiple lines and strip HTML tags
        
        items.push({
          id: generateId(),
          start: srtTimeToSeconds(timeMatch[1]),
          end: srtTimeToSeconds(timeMatch[2]),
          text: text.trim()
        });
      }
    }
  });

  return items;
};

export const parseAndMergeSRT = (srtEn: string, srtCn: string): Subtitle[] => {
  const enItems = parseSingleSRT(srtEn);
  const cnItems = parseSingleSRT(srtCn);

  // We rely on EN items for timing structure. We try to find matching CN item by time overlap.
  const merged: Subtitle[] = enItems.map(enItem => {
    // Find the CN item that has the biggest overlap with this EN item
    let bestMatch = '';
    let maxOverlap = 0;

    cnItems.forEach(cnItem => {
      const start = Math.max(enItem.start, cnItem.start);
      const end = Math.min(enItem.end, cnItem.end);
      const overlap = end - start;
      
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestMatch = cnItem.text;
      }
    });

    return {
      id: enItem.id,
      start: enItem.start,
      end: enItem.end,
      text_en: enItem.text,
      text_cn: bestMatch || ''
    };
  });

  return merged;
};

export const preMergeByPunctuation = (subtitles: Subtitle[]): Subtitle[] => {
  if (subtitles.length === 0) return [];
  const merged: Subtitle[] = [];
  let current = { ...subtitles[0] };

  for (let i = 1; i < subtitles.length; i++) {
    const next = subtitles[i];
    const trimmedEn = current.text_en.trim();
    const hasEndingPunctuation = /[.?!…]["']?\s*$/.test(trimmedEn);
    const gap = next.start - current.end;

    // Merge if current doesn't end with punctuation AND the gap is less than 2.0 seconds
    if (!hasEndingPunctuation && gap < 2.0) {
      current.end = next.end;
      // Add a space between merged texts
      current.text_en = `${trimmedEn} ${next.text_en.trim()}`;
      if (current.text_cn || next.text_cn) {
        current.text_cn = `${current.text_cn.trim()} ${next.text_cn.trim()}`.trim();
      }
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  return merged;
};

// Helper to format seconds (e.g. 125.45) to SRT time (00:02:05,450)
const formatSecondsToSRTTime = (seconds: number): string => {
  const pad = (num: number, size: number) => {
    let s = num.toString();
    while (s.length < size) s = "0" + s;
    return s.substring(0, size);
  };
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${pad(hrs, 2)}:${pad(mins, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
};

// Generates bilingual SRT file content
export const exportSubtitlesToSRT = (subtitles: Subtitle[]): string => {
  return subtitles.map((sub, index) => {
    const lines = [
      (index + 1).toString(),
      `${formatSecondsToSRTTime(sub.start)} --> ${formatSecondsToSRTTime(sub.end)}`,
      sub.text_en.trim()
    ];
    if (sub.text_cn && sub.text_cn.trim()) {
      lines.push(sub.text_cn.trim());
    }
    return lines.join('\n');
  }).join('\n\n');
};