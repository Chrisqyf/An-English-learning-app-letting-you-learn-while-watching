import { AIResponse, AISentenceAnalysis, AppSettings } from '../types';

// --- Internal Helpers ---

const makeGeminiRequest = async (systemPrompt: string, userPrompt: string, settings: AppSettings) => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${settings.modelName}:generateContent?key=${settings.apiKey}`;
  
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
          responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errorMessage = errorData.error?.message || response.statusText;
    
    if (response.status === 404) {
      errorMessage = `Model '${settings.modelName}' not found.`;
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

const makeOpenAIRequest = async (systemPrompt: string, userPrompt: string, settings: AppSettings) => {
  // Clean base URL to remove trailing slash if present
  const baseUrl = settings.baseUrl.replace(/\/$/, '');
  const endpoint = `${baseUrl}/chat/completions`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      // We rely on the system prompt instruction for JSON format as strict_json support varies by provider
      response_format: { type: "json_object" } 
    })
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

const callAI = async (systemPrompt: string, userPrompt: string, settings: AppSettings) => {
  if (settings.provider === 'openai') {
    return makeOpenAIRequest(systemPrompt, userPrompt, settings);
  } else {
    // Default to Gemini
    return makeGeminiRequest(systemPrompt, userPrompt, settings);
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