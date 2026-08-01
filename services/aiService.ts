import { AIResponse, AISentenceAnalysis, AppSettings } from '../types';

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

      if (inString) {
        cleaned += '"';
      }

      while (braceCount > 0) {
        cleaned += '}';
        braceCount--;
      }
      while (bracketCount > 0) {
        cleaned += ']';
        bracketCount--;
      }

      return JSON.parse(cleaned);
    } catch (err2: any) {
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
  const baseUrl = settings.baseUrl.replace(/\/$/, '');
  const endpoint = `${baseUrl}/chat/completions`;
  const model = options?.modelOverride || settings.modelName;

  const body: any = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
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
