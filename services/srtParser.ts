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

export const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const ensureUniqueIds = (subtitles: Subtitle[]): Subtitle[] => {
  const seenIds = new Set<string>();
  return subtitles.map((sub, idx) => {
    let id = sub.id;
    if (!id || seenIds.has(id)) {
      id = `${id || 'sub'}_${idx}_${generateId().substring(0, 8)}`;
    }
    seenIds.add(id);
    return { ...sub, id };
  });
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

  return normalizeAndFixSubtitles(merged);
};

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'eg', 'ie', 'us', 'uk', 'st', 'etc', 'vol', 'no', 'pm', 'am'
]);

// Check if a trimmed string ends with a true terminal sentence punctuation
export const hasTerminalPunctuation = (text: string): boolean => {
  if (!text) return false;
  const trimmed = text.trim();
  // Check for Chinese/English terminal punctuation
  const match = trimmed.match(/([a-zA-Z0-9]+)?([.?!…;：；！？。]+)["'”’)]?\s*$/);
  if (!match) return false;
  
  // If matched a dot after a word, check if it's an abbreviation
  const wordBeforeDot = match[1];
  if (wordBeforeDot && match[2] === '.') {
    if (ABBREVIATIONS.has(wordBeforeDot.toLowerCase())) {
      return false;
    }
  }
  return true;
};

const splitLongSubtitleAtClause = (sub: Subtitle): Subtitle[] => {
  const textEn = sub.text_en.trim();
  const textCn = sub.text_cn.trim();
  const duration = sub.end - sub.start;

  if (duration <= 18.0) return [sub];

  const words = textEn.split(/\s+/);
  if (words.length < 8) return [sub];

  // Find a word index near middle (between 30% and 70%) that ends with comma or semicolon or clause punctuation
  const minIdx = Math.floor(words.length * 0.3);
  const maxIdx = Math.floor(words.length * 0.7);
  
  let bestSplitIdx = -1;
  for (let i = minIdx; i <= maxIdx; i++) {
    if (/[,;:–—]\s*$/.test(words[i])) {
      bestSplitIdx = i;
      break;
    }
  }

  // If no comma found in middle range, search whole range for any clause mark
  if (bestSplitIdx === -1) {
    for (let i = 2; i < words.length - 2; i++) {
      if (/[,;:–—]\s*$/.test(words[i])) {
        bestSplitIdx = i;
        break;
      }
    }
  }

  // If still no punctuation mark found, fallback to middle word
  if (bestSplitIdx === -1) {
    bestSplitIdx = Math.floor(words.length / 2);
  }

  const part1Words = words.slice(0, bestSplitIdx + 1);
  const part2Words = words.slice(bestSplitIdx + 1);

  if (part1Words.length === 0 || part2Words.length === 0) return [sub];

  const part1Ratio = part1Words.length / words.length;
  const splitTime = sub.start + duration * part1Ratio;

  let part1Cn = '';
  let part2Cn = '';
  if (textCn) {
    const cnChars = Array.from(textCn);
    const splitCnIdx = Math.floor(cnChars.length * part1Ratio);
    part1Cn = cnChars.slice(0, splitCnIdx).join('');
    part2Cn = cnChars.slice(splitCnIdx).join('');
  }

  const sub1: Subtitle = {
    id: sub.id,
    start: Number(sub.start.toFixed(3)),
    end: Number(splitTime.toFixed(3)),
    text_en: part1Words.join(' '),
    text_cn: part1Cn
  };

  const sub2: Subtitle = {
    id: generateId(),
    start: Number(splitTime.toFixed(3)),
    end: Number(sub.end.toFixed(3)),
    text_en: part2Words.join(' '),
    text_cn: part2Cn
  };

  return [...splitLongSubtitleAtClause(sub1), ...splitLongSubtitleAtClause(sub2)];
};

export const preMergeByPunctuation = (subtitles: Subtitle[], targetMaxDuration = 14.0): Subtitle[] => {
  if (subtitles.length === 0) return [];

  // Phase 1: Group raw subtitles into complete sentence units
  const sentenceUnits: Subtitle[] = [];
  let currentUnit: Subtitle = { ...subtitles[0] };

  for (let i = 1; i < subtitles.length; i++) {
    const next = subtitles[i];
    const isTerminal = hasTerminalPunctuation(currentUnit.text_en);
    const gap = next.start - currentUnit.end;

    // Keep accumulating into current sentence unit if current unit does NOT end with terminal punctuation AND gap is reasonable (< 3.0s)
    if (!isTerminal && gap < 3.0) {
      currentUnit.end = next.end;
      currentUnit.text_en = `${currentUnit.text_en.trim()} ${next.text_en.trim()}`;
      if (currentUnit.text_cn || next.text_cn) {
        currentUnit.text_cn = `${(currentUnit.text_cn || '').trim()} ${(next.text_cn || '').trim()}`.trim();
      }
    } else {
      sentenceUnits.push(currentUnit);
      currentUnit = { ...next };
    }
  }
  sentenceUnits.push(currentUnit);

  // Phase 2: Merge adjacent complete sentence units into comfortable reading blocks (up to targetMaxDuration)
  const finalBlocks: Subtitle[] = [];
  let currentBlock: Subtitle = { ...sentenceUnits[0] };

  for (let i = 1; i < sentenceUnits.length; i++) {
    const nextUnit = sentenceUnits[i];
    const combinedDuration = nextUnit.end - currentBlock.start;
    const combinedWordCount = (currentBlock.text_en + ' ' + nextUnit.text_en).trim().split(/\s+/).length;

    if (combinedDuration <= targetMaxDuration && combinedWordCount <= 35) {
      currentBlock.end = nextUnit.end;
      currentBlock.text_en = `${currentBlock.text_en.trim()} ${nextUnit.text_en.trim()}`;
      if (currentBlock.text_cn || nextUnit.text_cn) {
        currentBlock.text_cn = `${(currentBlock.text_cn || '').trim()} ${(nextUnit.text_cn || '').trim()}`.trim();
      }
    } else {
      finalBlocks.push(currentBlock);
      currentBlock = { ...nextUnit };
    }
  }
  finalBlocks.push(currentBlock);

  // Phase 3: Split long sentences (> 18s) at clause punctuation marks if needed
  const result: Subtitle[] = [];
  for (const block of finalBlocks) {
    if (block.end - block.start > 18.0) {
      result.push(...splitLongSubtitleAtClause(block));
    } else {
      result.push(block);
    }
  }

  return normalizeAndFixSubtitles(result);
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

export const normalizeAndFixSubtitles = (
  subtitles: Subtitle[]
): Subtitle[] => {
  if (!subtitles || subtitles.length === 0) return [];

  const cleaned = subtitles
    .filter(item => (item.text_en && item.text_en.trim()) || (item.text_cn && item.text_cn.trim()))
    .map(s => {
      const start = Math.max(0, s.start);
      const end = s.end <= start ? start + 1.0 : s.end;
      return {
        ...s,
        start,
        end
      };
    })
    .sort((a, b) => a.start - b.start);

  return ensureUniqueIds(cleaned);
};

// Generates bilingual SRT file content
export const exportSubtitlesToSRT = (subtitles: Subtitle[]): string => {
  // Always clean and fix timeline overlaps before export!
  const normalized = normalizeAndFixSubtitles(subtitles);
  return normalized.map((sub, index) => {
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