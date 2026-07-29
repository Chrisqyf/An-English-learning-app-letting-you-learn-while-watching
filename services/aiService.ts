import { AIResponse, AISentenceAnalysis, AppSettings, Subtitle } from '../types';
import { ensureUniqueIds, hasTerminalPunctuation, preMergeByPunctuation } from './srtParser';

// --- Internal Helpers ---

const safeCleanAndParseJSON = (text: string): any => {
  if (!text) {
    throw new Error("Empty JSON input");
  }

  let cleaned = text.trim();

  // 1. Strip markdown code block wrappers
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "");
  }
  cleaned = cleaned.trim();

  // 2. Remove any trailing commas before closing brackets/braces (not allowed in standard JSON)
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  // 3. Try parsing first
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    console.warn("Initial JSON parsing failed, attempting repair... Error:", err.message);
    
    // Fallback: If we have an unterminated string or bracket mismatch, let's try to rescue what we can
    try {
      let braceCount = 0;
      let bracketCount = 0;
      let inString = false;
      let escape = false;

      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{') braceCount++;
          else if (char === '}') braceCount--;
          else if (char === '[') bracketCount++;
          else if (char === ']') bracketCount--;
        }
      }

      // If we have unclosed string, close it
      if (inString) {
        cleaned += '"';
      }

      // Balance braces
      while (braceCount > 0) {
        cleaned += '}';
        braceCount--;
      }
      // Balance brackets
      while (bracketCount > 0) {
        cleaned += ']';
        bracketCount--;
      }

      return JSON.parse(cleaned);
    } catch (err2: any) {
      // If it still fails, let's do a search for a valid JSON prefix/suffix if it was appended with text
      try {
        const firstCurly = cleaned.indexOf('{');
        const firstSquare = cleaned.indexOf('[');
        let startIndex = -1;
        if (firstCurly !== -1 && firstSquare !== -1) {
          startIndex = Math.min(firstCurly, firstSquare);
        } else if (firstCurly !== -1) {
          startIndex = firstCurly;
        } else if (firstSquare !== -1) {
          startIndex = firstSquare;
        }

        if (startIndex > 0) {
          cleaned = cleaned.substring(startIndex);
        }

        const lastCurly = cleaned.lastIndexOf('}');
        const lastSquare = cleaned.lastIndexOf(']');
        let endIndex = -1;
        if (lastCurly !== -1 && lastSquare !== -1) {
          endIndex = Math.max(lastCurly, lastSquare);
        } else if (lastCurly !== -1) {
          endIndex = lastCurly;
        } else if (lastSquare !== -1) {
          endIndex = lastSquare;
        }

        if (endIndex !== -1 && endIndex < cleaned.length - 1) {
          cleaned = cleaned.substring(0, endIndex + 1);
        }

        return JSON.parse(cleaned);
      } catch (err3) {
        throw new Error(`JSON parsing failed after repair attempts. Original error: ${err.message}`);
      }
    }
  }
};

const makeGeminiRequest = async (
  systemPrompt: string, 
  userPrompt: string, 
  settings: AppSettings,
  options?: { modelOverride?: string; temperature?: number; maxOutputTokens?: number }
) => {
  const model = options?.modelOverride || settings.modelName;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;
  
  // Gemini doesn't strictly have system/user separation in the basic API (unless using specific beta features),
  // but we can merge them effectively.
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: options?.temperature !== undefined ? options.temperature : 0.1,
        maxOutputTokens: options?.maxOutputTokens ?? 1500
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errorMessage = errorData.error?.message || response.statusText;
    
    if (response.status === 404) {
      errorMessage = `Model '${model}' not found.`;
    } else if (response.status === 400) {
      errorMessage = `Bad Request: ${errorMessage}`;
    } else if (response.status === 401 || response.status === 403) {
      errorMessage = "Invalid Gemini API Key.";
    }
    throw new Error(`Gemini Error (${response.status}): ${errorMessage}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textContent) throw new Error("No content received from Gemini");
  return safeCleanAndParseJSON(textContent);
};

const makeOpenAIRequest = async (
  systemPrompt: string, 
  userPrompt: string, 
  settings: AppSettings,
  options?: { modelOverride?: string; temperature?: number; maxOutputTokens?: number }
) => {
  // Clean base URL to remove trailing slash if present
  const baseUrl = settings.baseUrl.replace(/\/$/, '');
  const endpoint = `${baseUrl}/chat/completions`;
  const model = options?.modelOverride || settings.modelName;

  const body: any = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    // We rely on the system prompt instruction for JSON format as strict_json support varies by provider
    response_format: { type: "json_object" } 
  };

  if (options?.temperature !== undefined) {
    const isReasoningOnly = model.startsWith('o1') || model.startsWith('o3');
    if (!isReasoningOnly) {
      body.temperature = options.temperature;
    }
  }
  if (options?.maxOutputTokens !== undefined) {
    body.max_tokens = options.maxOutputTokens;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errorMessage = errorData.error?.message || response.statusText;
    
    if (response.status === 401) errorMessage = "Invalid API Key.";
    else if (response.status === 404) errorMessage = "Model or Endpoint not found.";
    
    throw new Error(`OpenAI-Compatible Error (${response.status}): ${errorMessage}`);
  }

  const data = await response.json();
  const textContent = data.choices?.[0]?.message?.content;

  if (!textContent) throw new Error("No content received from API");
  return safeCleanAndParseJSON(textContent);
};

const callAI = async (
  systemPrompt: string, 
  userPrompt: string, 
  settings: AppSettings,
  options?: { modelOverride?: string; temperature?: number; maxOutputTokens?: number }
) => {
  if (settings.provider === 'openai') {
    return makeOpenAIRequest(systemPrompt, userPrompt, settings, options);
  } else {
    // Default to Gemini
    return makeGeminiRequest(systemPrompt, userPrompt, settings, options);
  }
};

// --- Exports ---

export const fetchWordAnalysis = async (
  word: string, 
  context: string, 
  settings: AppSettings
): Promise<AIResponse> => {
  if (!settings.apiKey) {
    throw new Error("API Key is missing. Please configure it in settings.");
  }

  const systemPrompt = `You are a helpful dictionary assistant for an English learner. 
  Explain the target word within the provided context sentence.
  Return strictly valid JSON with no markdown formatting.
  Structure: { "definition": "string", "translation": "string (in Chinese)", "usage_example": "string (a new simple sentence using the word)" }`;
  
  const userPrompt = `Target Word: "${word}"\nContext Sentence: "${context}"`;

  try {
    return await callAI(systemPrompt, userPrompt, settings);
  } catch (error: any) {
    console.error("AI Word Analysis Error:", error);
    throw error;
  }
};

export const fetchSentenceAnalysis = async (
  sentence: string,
  settings: AppSettings
): Promise<AISentenceAnalysis> => {
  if (!settings.apiKey) {
    throw new Error("API Key is missing. Please configure it in settings.");
  }

  const systemPrompt = `You are an expert English teacher. Analyze the following sentence for an English learner.
  Return strictly valid JSON with no markdown formatting.
  Structure: 
  { 
    "translation": "string (Natural Chinese translation)", 
    "grammar_analysis": "string (Explain key grammar points, tense, clauses briefly)", 
    "idioms_and_collocations": "string (List any fixed phrases, idioms or interesting collocations found)" 
  }`;

  const userPrompt = `Target Sentence: "${sentence}"`;

  try {
    return await callAI(systemPrompt, userPrompt, settings);
  } catch (error: any) {
    console.error("AI Sentence Analysis Error:", error);
    throw error;
  }
};

// --- Subtitle Semantic Merging & Splitting Helpers ---

export interface AIMergedGroup {
  ids: string[];
  text_en: string;
  text_cn: string;
}

// Robust helper to extract a JSON array from either a raw array or a nested array inside an object
const extractJSONArray = <T>(response: any): T[] | null => {
  if (Array.isArray(response)) {
    return response as T[];
  }
  if (response && typeof response === 'object') {
    // Look for any key that contains an array
    for (const key of Object.keys(response)) {
      if (Array.isArray(response[key])) {
        return response[key] as T[];
      }
    }
  }
  return null;
};

const getFastModelOverride = (settings: AppSettings): string | undefined => {
  if (!settings.modelName) return undefined;
  const model = settings.modelName.toLowerCase();
  const isReasoning = model.includes('thinking') || model.includes('reasoner') || model.includes('deepseek-r1') || model.includes('o1') || model.includes('o3');
  
  if (isReasoning) {
    if (settings.provider === 'gemini') {
      return 'gemini-3.6-flash';
    } else {
      if (model.includes('deepseek')) {
        return 'deepseek-chat';
      }
      if (model.includes('gpt') || model.includes('o1') || model.includes('o3')) {
        return 'gpt-4o-mini';
      }
    }
  }
  return undefined;
};

// Robust local fallback splitter to ensure no single subtitle block exceeds maxDuration (e.g. 15s)
const fallbackSplitByDuration = (
  textEn: string,
  textCn: string,
  start: number,
  end: number,
  maxDuration = 15.0
): Subtitle[] => {
  const duration = end - start;
  if (duration <= maxDuration || duration <= 0) {
    return [{
      id: Math.random().toString(36).substring(2, 11),
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      text_en: textEn || "",
      text_cn: textCn || ""
    }];
  }

  const numParts = Math.ceil(duration / maxDuration);
  const words = (textEn || "").trim().split(/\s+/).filter(Boolean);
  
  if (words.length === 0) {
    const parts: Subtitle[] = [];
    const partDuration = duration / numParts;
    let currentStart = start;
    for (let i = 0; i < numParts; i++) {
      const partEnd = i === numParts - 1 ? end : currentStart + partDuration;
      parts.push({
        id: Math.random().toString(36).substring(2, 11),
        start: Number(currentStart.toFixed(3)),
        end: Number(partEnd.toFixed(3)),
        text_en: "",
        text_cn: ""
      });
      currentStart = partEnd;
    }
    return parts;
  }

  const wordsPerPart = Math.ceil(words.length / numParts);
  const cnChars = textCn ? Array.from(textCn.trim()) : [];
  const cnCharsPerPart = cnChars.length > 0 ? Math.ceil(cnChars.length / numParts) : 0;

  const parts: Subtitle[] = [];
  let currentStart = start;
  const partDuration = duration / numParts;

  for (let i = 0; i < numParts; i++) {
    const partWords = words.slice(i * wordsPerPart, (i + 1) * wordsPerPart);
    const partTextEn = partWords.join(' ');
    
    let partTextCn = '';
    if (cnChars.length > 0) {
      const partCnChars = cnChars.slice(i * cnCharsPerPart, (i + 1) * cnCharsPerPart);
      partTextCn = partCnChars.join('');
    }

    const partEnd = i === numParts - 1 ? end : currentStart + partDuration;
    
    parts.push({
      id: Math.random().toString(36).substring(2, 11),
      start: Number(currentStart.toFixed(3)),
      end: Number(partEnd.toFixed(3)),
      text_en: partTextEn,
      text_cn: partTextCn
    });

    currentStart = partEnd;
  }

  return parts;
};

export const aiSemanticMergeSubtitles = async (
  subtitles: Subtitle[],
  settings: AppSettings,
  onProgressUpdate?: (progress: number) => void
): Promise<Subtitle[]> => {
  if (!settings.apiKey) {
    throw new Error("API Key is missing for AI merging.");
  }

  const hasChineseInInput = subtitles.some(s => s.text_cn && s.text_cn.trim().length > 0);

  // 1. First, pre-merge input into complete sentence units using punctuation rules
  const sentenceSubs = preMergeByPunctuation(subtitles, 12.0);

  // 2. Divide into chunks BY sentence boundaries (target ~8-12 items per chunk)
  // Ensures NO chunk boundary cuts across an incomplete sentence!
  const chunks: Subtitle[][] = [];
  let currentChunk: Subtitle[] = [];

  for (let i = 0; i < sentenceSubs.length; i++) {
    currentChunk.push(sentenceSubs[i]);
    const isTerminal = hasTerminalPunctuation(sentenceSubs[i].text_en);
    if ((currentChunk.length >= 8 && isTerminal) || currentChunk.length >= 14) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  if (chunks.length === 0) return [];

  const chineseInstruction = hasChineseInInput
    ? "4. Combine and align the Chinese translations of the merged items naturally."
    : "4. CRITICAL: The input subtitles are English-only. You MUST set 'text_cn' to \"\" for all merged groups. Do NOT translate the English text or add any Chinese.";

  const systemPrompt = `You are an expert subtitle editor for English language learners.
Your primary task is to merge adjacent subtitle segments into complete English sentences or logical clauses, and align their Chinese translations.

CRITICAL RULES FOR SENTENCE BOUNDARIES & PUNCTUATION:
1. Every merged subtitle group MUST end at a proper sentence terminal punctuation mark (period '.', question mark '?', exclamation mark '!', or comma ',' / semicolon ';' if splitting a long clause).
2. NEVER cut off or end a subtitle group in the middle of a sentence at a non-punctuation word (e.g. "is a", "or so", "which is", "excited about"). Every group MUST be a complete, grammatically sound sentence or clause.
3. Do NOT merge adjacent sentences if their combined duration exceeds 15.0 seconds. If adding the next sentence would cause total duration to exceed 15.0 seconds, FINISH the current group at the end of the previous sentence. Do NOT start adding part of the next sentence if you cannot include its entire text up to its ending punctuation!
4. "ids" MUST be an array of string IDs in the exact order they were merged.
5. Do not change or omit any words from the English text.
${chineseInstruction}
6. Return strictly valid JSON matching:
{
  "merged_groups": [
    { "ids": ["id1", "id2"], "text_en": "Merged English sentence.", "text_cn": "合并后的中文句子。" }
  ]
}`;

  let completedCount = 0;
  const modelOverride = getFastModelOverride(settings);

  // Process a single chunk using AI
  const processChunk = async (chunk: Subtitle[]): Promise<Subtitle[]> => {
    const chunkProcessed: Subtitle[] = [];
    const userPrompt = JSON.stringify(
      chunk.map(s => ({ id: s.id, start: s.start, end: s.end, text_en: s.text_en, text_cn: s.text_cn })),
      null,
      2
    );

    try {
      const response = await callAI(systemPrompt, userPrompt, settings, {
        modelOverride,
        temperature: 0.0,
        maxOutputTokens: 2048
      });
      const groups = extractJSONArray<AIMergedGroup>(response);
      
      if (groups) {
        groups.forEach(group => {
          if (!group || !Array.isArray(group.ids)) return;
          const originalSubs = chunk.filter(s => group.ids.includes(s.id));
          if (originalSubs.length > 0) {
            originalSubs.sort((a, b) => a.start - b.start);
            chunkProcessed.push({
              id: originalSubs[0].id,
              start: originalSubs[0].start,
              end: originalSubs[originalSubs.length - 1].end,
              text_en: group.text_en || originalSubs.map(s => s.text_en).join(' '),
              text_cn: hasChineseInInput ? (group.text_cn || originalSubs.map(s => s.text_cn).join(' ')) : ""
            });
          }
        });

        // Fail-safe: if AI omitted some IDs, append them as-is
        const processedIds = new Set(groups.flatMap(g => g?.ids || []));
        chunk.forEach(s => {
          if (!processedIds.has(s.id)) {
            chunkProcessed.push(s);
          }
        });
      } else {
        chunkProcessed.push(...chunk);
      }
    } catch (err) {
      console.error("Error processing AI merging chunk:", err);
      chunkProcessed.push(...chunk);
    }

    let finalChunkSubs: Subtitle[] = [];
    try {
      // Scan for any merged card that is over 18.0 seconds and split it immediately in parallel!
      const splitTasks = chunkProcessed.map(async (sub) => {
        const duration = sub.end - sub.start;
        if (duration > 18.0) {
          const numParts = Math.ceil(duration / 15.0);
          try {
            const splitParts = await aiSemanticSplitSubtitle(sub, settings, numParts, hasChineseInInput);
            if (splitParts && splitParts.length > 0) {
              const totalTextLength = splitParts.reduce((sum, p) => sum + (p.text_en || "").length, 0);
              let currentStart = sub.start;
              const tempSubs: Subtitle[] = [];

              splitParts.forEach((part, idx) => {
                const textLength = (part.text_en || "").length;
                const portion = totalTextLength > 0 ? (textLength / totalTextLength) : (1 / splitParts.length);
                const partDuration = duration * portion;
                const partEnd = idx === splitParts.length - 1 ? sub.end : currentStart + partDuration;

                tempSubs.push({
                  id: Math.random().toString(36).substring(2, 11),
                  start: Number(currentStart.toFixed(3)),
                  end: Number(partEnd.toFixed(3)),
                  text_en: part.text_en || "",
                  text_cn: hasChineseInInput ? (part.text_cn || "") : ""
                });

                currentStart = partEnd;
              });

              // Guard: If any split part is still over 18s, apply local fallback splitter
              const checkedSubs: Subtitle[] = [];
              tempSubs.forEach(item => {
                if (item.end - item.start > 18.0) {
                  checkedSubs.push(...fallbackSplitByDuration(item.text_en, item.text_cn, item.start, item.end, 15.0));
                } else {
                  checkedSubs.push(item);
                }
              });
              return checkedSubs;
            }
          } catch (splitErr) {
            console.error("AI Semantic split failed or returned invalid parts within processChunk:", splitErr);
          }
          // Fallback if AI split failed completely or returned nothing
          return fallbackSplitByDuration(sub.text_en, sub.text_cn, sub.start, sub.end, 15.0);
        }
        return [sub];
      });

      finalChunkSubs = (await Promise.all(splitTasks)).flat();
    } catch (err) {
      console.error("Error during splitTasks processing:", err);
      finalChunkSubs = chunkProcessed;
    }

    completedCount++;
    if (onProgressUpdate) {
      const progress = Math.min(100, Math.round((completedCount / chunks.length) * 100));
      onProgressUpdate(progress);
    }

    return finalChunkSubs;
  };

  // Implement a controlled concurrency parallel execution (limit of 3 concurrent requests to respect rate-limiting)
  const concurrencyLimit = 3;
  const results: Subtitle[][] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkIndex = i;
    const task = async () => {
      results[chunkIndex] = await processChunk(chunks[chunkIndex]);
    };

    const p = task();
    executing.push(p);

    if (concurrencyLimit <= chunks.length) {
      const clean: Promise<void> = p.then(() => {
        const index = executing.indexOf(clean);
        if (index !== -1) executing.splice(index, 1);
      });
      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
      }
    }
  }
  await Promise.all(executing);

  // Flatten and sort the results
  let flattened: Subtitle[] = results.flat().filter(Boolean).sort((a, b) => a.start - b.start);

  // Final Pass: Sanitize boundaries to ensure no lingering fragment ends without terminal punctuation
  const sanitizeSentenceBoundaries = (subs: Subtitle[]): Subtitle[] => {
    if (subs.length <= 1) return subs;
    const sanitized: Subtitle[] = [];
    let current = { ...subs[0] };

    for (let i = 1; i < subs.length; i++) {
      const next = subs[i];
      const hasTerminal = hasTerminalPunctuation(current.text_en);

      // If current item does NOT end with terminal punctuation AND gap is small, fuse with next item
      if (!hasTerminal && (next.end - current.start) <= 22.0) {
        current.end = next.end;
        current.text_en = `${current.text_en.trim()} ${next.text_en.trim()}`;
        if (current.text_cn || next.text_cn) {
          current.text_cn = `${(current.text_cn || '').trim()} ${(next.text_cn || '').trim()}`.trim();
        }
      } else {
        sanitized.push(current);
        current = { ...next };
      }
    }
    sanitized.push(current);
    return sanitized;
  };

  flattened = sanitizeSentenceBoundaries(flattened);

  // Post-process to ensure if original had no Chinese, output has absolutely no Chinese
  if (!hasChineseInInput) {
    flattened.forEach(s => {
      s.text_cn = "";
    });
  }

  return ensureUniqueIds(flattened.sort((a, b) => a.start - b.start));
};

export const aiSemanticSplitSubtitle = async (
  subtitle: Subtitle,
  settings: AppSettings,
  numParts?: number,
  hasChineseInInput = true
): Promise<{ text_en: string; text_cn: string }[]> => {
  if (!settings.apiKey) {
    throw new Error("API Key is missing for AI splitting.");
  }

  const partGuideline = numParts 
    ? `You MUST split this subtitle into EXACTLY ${numParts} parts so that each part has a brief duration (around 10-15 seconds or less).`
    : `You should split this subtitle into 2 or more smaller, grammatically complete or natural breath-length clauses.`;

  const chineseInstruction = hasChineseInInput
    ? "3. Align the Chinese translations exactly to each English part."
    : "3. CRITICAL: The input subtitles are English-only. You MUST set 'text_cn' to \"\" for all split parts. Do NOT translate the English text or write any Chinese.";

  const systemPrompt = `You are an expert subtitle editor.
You are given a single subtitle card that is too long (over 18 seconds) and contains multiple clauses or thoughts.
Your task is to split this subtitle into smaller, grammatically complete or natural breath-length clauses.
${partGuideline}

CRITICAL: Do NOT execute any reasoning, thinking, or chain-of-thought steps. Start your response directly with the JSON data, returning ONLY the valid JSON structure and nothing else.

Input:
English: "${subtitle.text_en}"
Chinese: "${subtitle.text_cn}"

Guidelines:
1. Split the text at natural pauses or clause boundaries (like commas, conjunctions, relative clauses).
2. Ensure every split part is easy to read and understand.
${chineseInstruction}
4. Do NOT add, change, or omit any information or words from the original English text.
5. Return strictly valid JSON, either a JSON object with a "split_parts" key containing the array:
{
  "split_parts": [
    { "text_en": "Part 1 of English", "text_cn": "对应的中文部分1" },
    ...
  ]
}
OR a raw JSON array:
[
  { "text_en": "Part 1 of English", "text_cn": "对应的中文部分1" },
  ...
]`;

  const userPrompt = `Please split the provided subtitle according to the guidelines.`;
  const modelOverride = getFastModelOverride(settings);

  try {
    const response = await callAI(systemPrompt, userPrompt, settings, {
      modelOverride,
      temperature: 0.0,
      maxOutputTokens: 1024
    });
    const splitParts = extractJSONArray<{ text_en: string; text_cn: string }>(response);
    
    if (splitParts && splitParts.length > 0) {
      return splitParts;
    }
    throw new Error("Invalid response format: No array of split parts found in response.");
  } catch (err) {
    console.error("Error spliting subtitle via AI:", err);
    // Fallback split by half if AI fails
    const halfLen = Math.floor(subtitle.text_en.length / 2);
    const splitIndex = subtitle.text_en.indexOf(' ', halfLen);
    if (splitIndex !== -1) {
      return [
        { text_en: subtitle.text_en.substring(0, splitIndex).trim(), text_cn: subtitle.text_cn },
        { text_en: subtitle.text_en.substring(splitIndex).trim(), text_cn: '' }
      ];
    }
    return [{ text_en: subtitle.text_en, text_cn: subtitle.text_cn }];
  }
};