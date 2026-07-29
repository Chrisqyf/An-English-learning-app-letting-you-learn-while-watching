import { AIResponse, AISentenceAnalysis, AppSettings } from '../types';

// --- Internal Helpers ---

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
  return JSON.parse(textContent);
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
  return JSON.parse(textContent);
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
      return 'gemini-2.0-flash';
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

export const aiSemanticMergeSubtitles = async (
  subtitles: Subtitle[],
  settings: AppSettings,
  onProgressUpdate?: (progress: number) => void
): Promise<Subtitle[]> => {
  if (!settings.apiKey) {
    throw new Error("API Key is missing for AI merging.");
  }

  const chunkSize = 15;
  const totalSubtitles = subtitles.length;
  
  // Divide into chunks
  const chunks: Subtitle[][] = [];
  for (let i = 0; i < totalSubtitles; i += chunkSize) {
    chunks.push(subtitles.slice(i, i + chunkSize));
  }

  if (chunks.length === 0) return [];

  const systemPrompt = `You are an expert subtitle editor.
Your task is to merge adjacent subtitle segments that belong to the same complete English sentence or logical clause, and align their Chinese translations.

CRITICAL: Do NOT execute any reasoning, thinking, or chain-of-thought steps. Start your output directly with the JSON data, returning ONLY the valid JSON structure and nothing else.

Input format: A JSON array of subtitle items, each with "id", "text_en", and "text_cn".
Output format: A JSON object with a "merged_groups" key containing the array of merged groups (or simply a JSON array of merged groups).

Guidelines:
1. Only merge adjacent items if they form a single coherent sentence or clause. Do not merge unrelated sentences.
2. Do not change the meaning or omit any words from the English text. Only correct capitalization, spacing, and punctuation if needed.
3. Combine and align the Chinese translations of the merged items naturally.
4. "ids" MUST be an array of string IDs in the exact order they were merged (e.g. ["id1", "id2"]).
5. Return strictly valid JSON matching either:
{
  "merged_groups": [
    { "ids": ["id1", "id2"], "text_en": "Merged English sentence.", "text_cn": "合并后的中文句子。" }
  ]
}
OR:
[
  { "ids": ["id1", "id2"], "text_en": "Merged English sentence.", "text_cn": "合并后的中文句子。" }
]`;

  let completedCount = 0;
  const modelOverride = getFastModelOverride(settings);

  // Process a single chunk using AI
  const processChunk = async (chunk: Subtitle[]): Promise<Subtitle[]> => {
    const chunkProcessed: Subtitle[] = [];
    const userPrompt = JSON.stringify(
      chunk.map(s => ({ id: s.id, text_en: s.text_en, text_cn: s.text_cn })),
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
              text_cn: group.text_cn || originalSubs.map(s => s.text_cn).join(' ')
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
          try {
            const splitParts = await aiSemanticSplitSubtitle(sub, settings);
            if (splitParts.length > 1) {
              const totalTextLength = splitParts.reduce((sum, p) => sum + p.text_en.length, 0);
              let currentStart = sub.start;
              const subs: Subtitle[] = [];

              splitParts.forEach((part, idx) => {
                const portion = totalTextLength > 0 ? (part.text_en.length / totalTextLength) : (1 / splitParts.length);
                const partDuration = duration * portion;
                const partEnd = idx === splitParts.length - 1 ? sub.end : currentStart + partDuration;

                subs.push({
                  id: Math.random().toString(36).substring(2, 11),
                  start: Number(currentStart.toFixed(3)),
                  end: Number(partEnd.toFixed(3)),
                  text_en: part.text_en,
                  text_cn: part.text_cn
                });

                currentStart = partEnd;
              });
              return subs;
            }
          } catch (splitErr) {
            console.error("AI Semantic split failed within processChunk, keeping original:", splitErr);
          }
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
  const flattened: Subtitle[] = results.flat().filter(Boolean);
  return flattened.sort((a, b) => a.start - b.start);
};

export const aiSemanticSplitSubtitle = async (
  subtitle: Subtitle,
  settings: AppSettings
): Promise<{ text_en: string; text_cn: string }[]> => {
  if (!settings.apiKey) {
    throw new Error("API Key is missing for AI splitting.");
  }

  const systemPrompt = `You are an expert subtitle editor.
You are given a single subtitle card that is too long (over 18 seconds) and contains multiple clauses or thoughts.
Your task is to split this subtitle into 2 or more smaller, grammatically complete or natural breath-length clauses.

CRITICAL: Do NOT execute any reasoning, thinking, or chain-of-thought steps. Start your response directly with the JSON data, returning ONLY the valid JSON structure and nothing else.

Input:
English: "${subtitle.text_en}"
Chinese: "${subtitle.text_cn}"

Guidelines:
1. Split the text at natural pauses or clause boundaries (like commas, conjunctions, relative clauses).
2. Ensure every split part is easy to read and understand.
3. Align the Chinese translations exactly to each English part.
4. Do NOT add, change, or omit any information or words from the original English text.
5. Return strictly valid JSON, either a JSON object with a "split_parts" key containing the array:
{
  "split_parts": [
    { "text_en": "Part 1 of English", "text_cn": "对应的中文部分1" },
    { "text_en": "Part 2 of English", "text_cn": "对应的中文部分2" }
  ]
}
OR a raw JSON array:
[
  { "text_en": "Part 1 of English", "text_cn": "对应的中文部分1" },
  { "text_en": "Part 2 of English", "text_cn": "对应的中文部分2" }
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