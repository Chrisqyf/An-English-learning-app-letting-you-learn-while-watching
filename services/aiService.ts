import { AIResponse, AISentenceAnalysis, AppSettings } from '../types';

export const fetchWordAnalysis = async (
  word: string, 
  context: string, 
  settings: AppSettings
): Promise<AIResponse> => {
  if (!settings.apiKey) {
    throw new Error("API Key is missing. Please configure it in settings.");
  }

  // Use the native Google Gemini API endpoint
  // Docs: https://ai.google.dev/api/rest/v1beta/models/generateContent
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${settings.modelName}:generateContent?key=${settings.apiKey}`;

  const prompt = `You are a helpful dictionary assistant for an English learner. 
  Explain the target word within the provided context sentence.
  Return strictly valid JSON with no markdown formatting.
  Structure: { "definition": "string", "translation": "string (in Chinese)", "usage_example": "string (a new simple sentence using the word)" }
  
  Target Word: "${word}"
  Context Sentence: "${context}"`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
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
        errorMessage = `Model '${settings.modelName}' not found. Verify the model name in settings (e.g., gemini-1.5-flash).`;
      } else if (response.status === 400) {
        errorMessage = `Bad Request: ${errorMessage}`;
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = "Invalid API Key or permissions.";
      }

      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    
    // Parse Google Native API Response Structure
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) throw new Error("No content received from AI");

    return JSON.parse(textContent);
  } catch (error: any) {
    console.error("AI Service Error:", error);
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

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${settings.modelName}:generateContent?key=${settings.apiKey}`;

  const prompt = `You are an expert English teacher. Analyze the following sentence for an English learner.
  
  Target Sentence: "${sentence}"

  Return strictly valid JSON with no markdown formatting.
  Structure: 
  { 
    "translation": "string (Natural Chinese translation)", 
    "grammar_analysis": "string (Explain key grammar points, tense, clauses briefly)", 
    "idioms_and_collocations": "string (List any fixed phrases, idioms or interesting collocations found)" 
  }`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || response.statusText);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) throw new Error("No content received from AI");

    return JSON.parse(textContent);
  } catch (error: any) {
    console.error("AI Sentence Analysis Error:", error);
    throw error;
  }
};