import { BibleQuestionCategory, BibleQuestionDifficulty } from '../types';

export interface GeneratedBibleQuestion {
  questionText: string;
  category: BibleQuestionCategory;
  difficulty: BibleQuestionDifficulty;
  options: [string, string, string, string];
  correctOptionIndex: number;
  bibleReference: string;
  explanation: string;
}

export const VALID_BIBLE_CATEGORIES: BibleQuestionCategory[] = [
  'Bible Characters',
  'Old Testament',
  'New Testament',
  'Life and Teachings of Jesus',
  'Miracles and Parables',
  'Books of the Bible',
  'Scripture Knowledge'
];

export const VALID_BIBLE_DIFFICULTIES: BibleQuestionDifficulty[] = ['easy', 'medium', 'hard'];

export class BibleAiService {
  /**
   * Generates a single verified multiple-choice Bible question using configured AI provider.
   * Server-authoritative: validates inputs and normalizes provider response.
   */
  public static async generateQuestion(
    rawCategory: string,
    rawDifficulty: string
  ): Promise<GeneratedBibleQuestion> {
    // 1. Validate category
    const category = VALID_BIBLE_CATEGORIES.find(
      c => c.toLowerCase() === (rawCategory || '').trim().toLowerCase()
    );
    if (!category) {
      throw new Error(
        `Invalid category "${rawCategory}". Allowed categories: ${VALID_BIBLE_CATEGORIES.join(', ')}`
      );
    }

    // 2. Validate difficulty
    const difficulty = VALID_BIBLE_DIFFICULTIES.find(
      d => d.toLowerCase() === (rawDifficulty || '').trim().toLowerCase()
    );
    if (!difficulty) {
      throw new Error(
        `Invalid difficulty "${rawDifficulty}". Allowed difficulties: ${VALID_BIBLE_DIFFICULTIES.join(', ')}`
      );
    }

    // 3. Check configured provider credentials
    const geminiKey = process.env.GEMINI_API_KEY?.trim() || process.env.AI_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    if (!geminiKey && !openaiKey) {
      throw new Error(
        'AI question generation is not configured. Please set the GEMINI_API_KEY (or OPENAI_API_KEY) environment variable in your Vercel project settings.'
      );
    }

    // 4. Construct prompt
    const prompt = BibleAiService.buildGenerationPrompt(category, difficulty);

    let rawJsonText: string;

    // 5. Invoke provider
    if (geminiKey) {
      rawJsonText = await BibleAiService.callGemini(geminiKey, prompt);
    } else {
      rawJsonText = await BibleAiService.callOpenAI(openaiKey!, prompt);
    }

    // 6. Parse and validate output
    return BibleAiService.parseAndValidateResponse(rawJsonText, category, difficulty);
  }

  private static buildGenerationPrompt(
    category: BibleQuestionCategory,
    difficulty: BibleQuestionDifficulty
  ): string {
    const difficultyGuidance = {
      easy: 'Suitable for beginners and young believers; focuses on well-known Bible stories, central biblical figures, and famous verses.',
      medium: 'Requires standard Scripture familiarity; covers historical details, parables, specific prophets, kings, apostles, or gospel events.',
      hard: 'Challenging trivia for deep Scripture scholars; covers obscure details, specific chapter facts, genealogies, or precise biblical chronologies.'
    }[difficulty];

    return `You are a reverent, doctrinally sound Christian biblical scholar and trivia editor for the Faith Preachers Ministries Int'l Bible Challenge game.

Generate exactly ONE multiple-choice Bible trivia question meeting these strict specifications:

Category: "${category}"
Difficulty: "${difficulty}" (${difficultyGuidance})

STRICT REQUIREMENTS:
1. Question Prompt: Clear, engaging, grammatically flawless, and unambiguous. Only one indisputable biblical answer exists.
2. Answer Choices: Exactly 4 distinct choices labeled A, B, C, D (or as an array of 4 strings). All choices must be plausible biblical names, places, or concepts, with no duplicates.
3. Correct Answer: Clearly identify which choice is correct ('A', 'B', 'C', or 'D', or 0, 1, 2, 3).
4. Bible Reference: Provide the exact Bible book, chapter, and verse(s) where this fact is confirmed (e.g., "1 Samuel 17:48-50", "John 11:35", "Acts 9:3-6"). DO NOT invent or approximate verse references.
5. Scripture Explanation: Provide a concise (1-2 sentences), encouraging, educational explanation referencing the Scripture proof.
6. Absolutely NO non-biblical mythology, personal opinions, or disputed doctrines.

Return ONLY a valid, raw JSON object (without markdown fences, commentary, or extra text) following this exact JSON structure:
{
  "questionText": "Question prompt string here?",
  "options": ["Choice A text", "Choice B text", "Choice C text", "Choice D text"],
  "correctAnswer": "A",
  "bibleReference": "Book Chapter:Verse",
  "explanation": "Concise scriptural explanation confirming the answer."
}`;
  }

  private static cachedGeminiModel: string | null = null;
  private static cachedGeminiApiVersion: 'v1beta' = 'v1beta';

  /**
   * Clears the in-memory cached model selection (for testing and runtime config reloads).
   */
  public static resetModelCache(): void {
    BibleAiService.cachedGeminiModel = null;
    BibleAiService.cachedGeminiApiVersion = 'v1beta';
  }

  /**
   * Sanitizes text to prevent any leakage of API keys, bearer tokens, or query secrets in error messages.
   */
  public static sanitizeSecret(message: string, secret?: string): string {
    if (!message) return '';
    let sanitized = message;
    if (secret && secret.length > 4) {
      sanitized = sanitized.split(secret).join('[REDACTED_API_KEY]');
    }
    // Redact key=... or key%3D... query params from URLs
    sanitized = sanitized.replace(/key=[\w-]+/gi, 'key=[REDACTED]');
    sanitized = sanitized.replace(/key%3D[\w-]+/gi, 'key=[REDACTED]');
    return sanitized;
  }

  /**
   * Discovers the best available Gemini model for the provided API key.
   * If GEMINI_MODEL is set in environment, uses that model directly.
   * Otherwise queries the Gemini API's ModelService.ListModels endpoint on v1beta
   * to discover active models supporting generateContent, prioritizing cost-effective/free-tier Flash models.
   */
  public static async resolveGeminiModel(
    apiKey: string
  ): Promise<{ model: string; apiVersion: 'v1beta' }> {
    if (BibleAiService.cachedGeminiModel) {
      return {
        model: BibleAiService.cachedGeminiModel,
        apiVersion: BibleAiService.cachedGeminiApiVersion
      };
    }

    // 1. Check configurable server-side environment variable (GEMINI_MODEL)
    if (process.env.GEMINI_MODEL?.trim()) {
      const explicit = process.env.GEMINI_MODEL.trim().replace(/^models\//, '');
      BibleAiService.cachedGeminiModel = explicit;
      BibleAiService.cachedGeminiApiVersion = 'v1beta';
      return { model: explicit, apiVersion: 'v1beta' };
    }

    // 2. Discover available models via Gemini ModelService.ListModels endpoint
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let listRes: Response;
    try {
      listRes = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(
          'Gemini API model discovery timed out after 10 seconds. Check network connectivity or set GEMINI_MODEL in Vercel.'
        );
      }
      throw new Error(
        `Failed to contact Gemini API for model discovery: ${BibleAiService.sanitizeSecret(err.message, apiKey)}`
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!listRes.ok) {
      const errorText = await listRes.text().catch(() => '');
      let rawMsg = '';
      try {
        const errObj = JSON.parse(errorText);
        rawMsg = errObj.error?.message || '';
      } catch {}

      const cleanMsg = BibleAiService.sanitizeSecret(rawMsg || `HTTP ${listRes.status}`, apiKey);

      if (listRes.status === 403) {
        throw new Error(
          `Gemini API permission error (HTTP 403): The provided API key is invalid or lacks permissions, or the Generative Language API is not enabled in your Google Cloud / AI Studio project (${cleanMsg}).`
        );
      }
      if (listRes.status === 429) {
        throw new Error(
          `Gemini API quota exceeded (HTTP 429): Quota or rate limit exceeded during model discovery (${cleanMsg}).`
        );
      }
      if (listRes.status === 404) {
        throw new Error(
          `Gemini API endpoint not found (HTTP 404): Model discovery endpoint could not be reached (${cleanMsg}).`
        );
      }
      throw new Error(`Gemini API error during model discovery (HTTP ${listRes.status}): ${cleanMsg}`);
    }

    const data: any = await listRes.json();
    const list: any[] = Array.isArray(data.models) ? data.models : [];

    // Filter to models that explicitly support generateContent
    const supported = list.filter(m => {
      const methods: string[] = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
      return methods.includes('generateContent');
    });

    if (supported.length === 0) {
      throw new Error(
        'No models supporting "generateContent" were found in your Gemini project. Please ensure Generative Language API is enabled with model access.'
      );
    }

    // Cost-effective / free-tier preference ranking:
    // 1. gemini-1.5-flash / gemini-2.0-flash (fast, high limits, free-tier eligible)
    // 2. Any other flash model (e.g. gemini-1.5-flash-8b)
    // 3. Any available gemini model
    const flashPreferred = supported.find(m => {
      const name = (m.name || '').toLowerCase();
      return name.includes('1.5-flash') || name.includes('2.0-flash');
    });
    const anyFlash = supported.find(m => (m.name || '').toLowerCase().includes('flash'));
    const anyGemini = supported.find(m => (m.name || '').toLowerCase().includes('gemini'));

    const chosen = flashPreferred || anyFlash || anyGemini || supported[0];
    const modelName = (chosen.name || '').replace(/^models\//, '');

    if (!modelName) {
      throw new Error('Failed to extract a valid model name from Gemini model list.');
    }

    BibleAiService.cachedGeminiModel = modelName;
    BibleAiService.cachedGeminiApiVersion = 'v1beta';

    return { model: modelName, apiVersion: 'v1beta' };
  }

  private static async callGemini(apiKey: string, prompt: string): Promise<string> {
    const resolved = await BibleAiService.resolveGeminiModel(apiKey);
    const model = resolved.model;
    const apiVersion = resolved.apiVersion;

    const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
            responseMimeType: 'application/json'
          }
        }),
        signal: controller.signal
      });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('AI generation timed out after 25 seconds. Please try again.');
      }
      throw new Error(`Failed to connect to Gemini API: ${BibleAiService.sanitizeSecret(err.message, apiKey)}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let rawMsg = '';
      try {
        const errObj = JSON.parse(errorText);
        rawMsg = errObj.error?.message || '';
      } catch {}

      const cleanMsg = BibleAiService.sanitizeSecret(rawMsg || `HTTP ${response.status}`, apiKey);

      // Separate error classification as required:
      // 404: invalid, unavailable, or incompatible model/API version.
      if (response.status === 404 || cleanMsg.toLowerCase().includes('not found')) {
        throw new Error(
          `Gemini model not found (HTTP 404): Model "${model}" is not found or not supported for generateContent on API ${apiVersion}. Set GEMINI_MODEL in Vercel to a supported model (e.g. "gemini-1.5-flash").`
        );
      }
      // 429: quota or rate limit exceeded.
      if (
        response.status === 429 ||
        cleanMsg.toLowerCase().includes('quota') ||
        cleanMsg.toLowerCase().includes('rate limit')
      ) {
        throw new Error(
          `Gemini API quota or rate limit exceeded (HTTP 429): Quota exceeded for model "${model}". Please wait a moment or review your Google AI Studio quota limits.`
        );
      }
      // 403: permission, project access, or billing restrictions.
      if (
        response.status === 403 ||
        cleanMsg.toLowerCase().includes('permission') ||
        cleanMsg.toLowerCase().includes('billing')
      ) {
        throw new Error(
          `Gemini API permission denied (HTTP 403): The provided API key lacks permission or the Generative Language API is disabled in your Google Cloud / AI Studio project. Verify key permissions in Google AI Studio.`
        );
      }
      // 400: bad request / invalid argument
      if (response.status === 400) {
        throw new Error(`Gemini API bad request (HTTP 400): ${cleanMsg}`);
      }

      throw new Error(`AI generation failed (HTTP ${response.status}): ${cleanMsg}`);
    }

    const data: any = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string') {
      throw new Error('Gemini API returned an empty or malformed candidate response. Please try again.');
    }

    return text;
  }

  private static async callOpenAI(apiKey: string, prompt: string): Promise<string> {
    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert Bible trivia question generator. Respond with pure JSON matching the requested schema.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 800,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errMsg = `OpenAI API returned status ${response.status}`;
        try {
          const errObj = JSON.parse(errorText);
          if (errObj.error?.message) errMsg = errObj.error.message;
        } catch {}
        throw new Error(`AI generation failed: ${errMsg}`);
      }

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error('AI provider returned an empty response. Please try again.');
      }
      return content;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('AI generation timed out after 20 seconds. Please try again.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  public static parseAndValidateResponse(
    rawText: string,
    expectedCategory: BibleQuestionCategory,
    expectedDifficulty: BibleQuestionDifficulty
  ): GeneratedBibleQuestion {
    // Strip markdown code fences if present
    let cleaned = rawText.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err: any) {
      throw new Error(`AI returned invalid JSON syntax: ${err.message}. Please regenerate.`);
    }

    // 1. Question Prompt
    const questionText = (parsed.questionText || parsed.questionPrompt || parsed.question || '').trim();
    if (!questionText || questionText.length < 10) {
      throw new Error('AI generated an incomplete question prompt. Please regenerate.');
    }

    // 2. Options validation
    let rawOptions: any[] = [];
    if (Array.isArray(parsed.options)) {
      rawOptions = parsed.options;
    } else if (parsed.options && typeof parsed.options === 'object') {
      rawOptions = [
        parsed.options.A || parsed.options.a,
        parsed.options.B || parsed.options.b,
        parsed.options.C || parsed.options.c,
        parsed.options.D || parsed.options.d
      ];
    }

    const options = rawOptions.map(o => (typeof o === 'string' ? o.trim() : String(o || '').trim()));
    if (options.length !== 4 || options.some(o => !o)) {
      throw new Error('AI question must contain exactly 4 non-empty answer choices. Please regenerate.');
    }

    // Distinct choices check (case-insensitive)
    const distinctSet = new Set(options.map(o => o.toLowerCase()));
    if (distinctSet.size !== 4) {
      throw new Error('AI generated duplicate answer choices. Please regenerate.');
    }

    // 3. Correct Answer Identifier
    let correctIndex = -1;
    const rawCorrect = parsed.correctAnswer ?? parsed.correctOptionIndex ?? parsed.correctIndex;

    if (typeof rawCorrect === 'number' && rawCorrect >= 0 && rawCorrect <= 3) {
      correctIndex = rawCorrect;
    } else if (typeof rawCorrect === 'string') {
      const upper = rawCorrect.trim().toUpperCase();
      if (upper === 'A' || upper === '0' || upper === 'OPTION A') correctIndex = 0;
      else if (upper === 'B' || upper === '1' || upper === 'OPTION B') correctIndex = 1;
      else if (upper === 'C' || upper === '2' || upper === 'OPTION C') correctIndex = 2;
      else if (upper === 'D' || upper === '3' || upper === 'OPTION D') correctIndex = 3;
      else {
        // Check if string matches one of the option values directly
        const matchIdx = options.findIndex(opt => opt.toLowerCase() === rawCorrect.trim().toLowerCase());
        if (matchIdx !== -1) correctIndex = matchIdx;
      }
    }

    if (correctIndex < 0 || correctIndex > 3) {
      throw new Error('AI returned an invalid correct answer choice identifier. Please regenerate.');
    }

    // 4. Bible Reference
    const bibleReference = (parsed.bibleReference || parsed.reference || '').trim();
    if (!bibleReference || bibleReference.length < 3) {
      throw new Error('AI failed to provide a valid Bible reference. Please regenerate.');
    }

    // 5. Explanation
    const explanation = (parsed.explanation || parsed.scriptureExplanation || '').trim();
    if (!explanation || explanation.length < 5) {
      throw new Error('AI failed to provide a Scripture explanation. Please regenerate.');
    }

    return {
      questionText,
      category: expectedCategory,
      difficulty: expectedDifficulty,
      options: [options[0], options[1], options[2], options[3]],
      correctOptionIndex: correctIndex,
      bibleReference,
      explanation
    };
  }
}
