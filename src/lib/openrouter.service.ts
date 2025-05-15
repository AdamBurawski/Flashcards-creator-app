import { z } from 'zod';

/**
 * Interfejs określający parametry modelu LLM
 */
export interface ModelParameters {
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  max_tokens?: number;
}

/**
 * Interfejs dla struktury komunikatu w formacie ChatGPT
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Interfejs dla schematu JSON
 */
interface JSONSchema {
  name: string;
  schema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Interfejs dla ładunku żądania do API OpenRouter
 */
interface RequestPayload {
  model: string;
  messages: ChatMessage[];
  response_format?: {
    type: string;
    json_schema?: Record<string, any>;
  };
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  max_tokens?: number;
}

/**
 * Interfejs odpowiedzi od API OpenRouter
 */
interface ApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Interfejs dla wyniku zwracanego przez sendChatMessage
 */
export interface ChatCompletionResult<T> {
  response: T;
  usage: ApiResponse['usage'];
}

/**
 * Interfejs dla opcji inicjalizacyjnych serwisu
 */
interface OpenRouterServiceOptions {
  apiKey: string;
  apiUrl?: string;
  timeout?: number;
  retries?: number;
  defaultModel?: string;
  defaultModelParams?: ModelParameters;
  logger?: Logger;
  maxHistoryLength?: number;
  maskSensitiveData?: boolean;
}

/**
 * Interfejs dla loggera
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * Domyślny logger do konsoli
 */
class ConsoleLogger implements Logger {
  debug(message: string, ...args: any[]): void {
    console.debug(message, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }
}

/**
 * Błąd autentykacji w API
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Błąd przekroczenia limitu API
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Błąd przetwarzania odpowiedzi API
 */
export class ResponseProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResponseProcessingError';
  }
}

/**
 * Błąd braku odpowiedzi od API
 */
export class NoResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoResponseError';
  }
}

/**
 * Klasa serwisu OpenRouter do komunikacji z modelami LLM
 */
export class OpenRouterService {
  public apiUrl: string;
  private readonly _apiKey: string;
  public defaultModelName: string;
  public defaultModelParams: ModelParameters;
  public timeout: number;
  public retries: number;
  private logger: Logger;
  private maxHistoryLength: number;
  private maskSensitiveData: boolean;

  private currentSystemMessage: string = '';
  private currentUserMessage: string = '';
  private currentResponseFormat?: JSONSchema;
  private currentModelName?: string;
  private currentModelParameters?: ModelParameters;
  private messageHistory: ChatMessage[] = [];

  // Schemat walidacji odpowiedzi z API
  private apiResponseSchema = z.object({
    id: z.string(),
    object: z.string(),
    created: z.number(),
    model: z.string(),
    choices: z.array(
      z.object({
        index: z.number(),
        message: z.object({
          role: z.string(),
          content: z.string(),
        }),
        finish_reason: z.string(),
      })
    ).min(1),
    usage: z.object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    }),
  });

  /**
   * Konstruktor serwisu OpenRouter
   */
  constructor(options: OpenRouterServiceOptions) {
    this._apiKey = options.apiKey;
    this.apiUrl = options.apiUrl || 'https://openrouter.ai/api/v1/chat/completions';
    this.timeout = options.timeout || 30000; // 30 sekund domyślnie
    this.retries = options.retries || 3;
    this.defaultModelName = options.defaultModel || 'openai/gpt-4o-mini';
    this.defaultModelParams = options.defaultModelParams || {
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 1000
    };
    this.logger = options.logger || new ConsoleLogger();
    this.maxHistoryLength = options.maxHistoryLength || 10;
    this.maskSensitiveData = options.maskSensitiveData !== undefined ? options.maskSensitiveData : true;
  }

  /**
   * Getter dla apiKey - nie pozwala na bezpośredni dostęp do klucza
   */
  get apiKey(): string {
    return this.maskSensitiveData ? '********' : this._apiKey;
  }

  /**
   * Ustawia komunikat systemowy
   */
  public setSystemMessage(message: string): void {
    this.currentSystemMessage = message;
    this.logger.debug('Ustawiono komunikat systemowy');
  }

  /**
   * Ustawia komunikat użytkownika
   */
  public setUserMessage(message: string): void {
    this.currentUserMessage = message;
    this.logger.debug('Ustawiono komunikat użytkownika');
  }

  /**
   * Ustawia format odpowiedzi jako schemat JSON
   */
  public setResponseFormat(schema: JSONSchema): void {
    this.currentResponseFormat = schema;
    this.logger.debug(`Ustawiono format odpowiedzi: ${schema.name}`);
  }

  /**
   * Ustawia model i jego parametry
   */
  public setModel(name: string, parameters?: ModelParameters): void {
    this.currentModelName = name;
    this.currentModelParameters = parameters;
    this.logger.debug(`Ustawiono model: ${name}`);
  }

  /**
   * Dodaje wiadomość do historii z zachowaniem limitu długości
   */
  private addMessageToHistory(role: 'system' | 'user' | 'assistant', content: string): void {
    this.messageHistory.push({ role, content });
    
    // Usuń najstarsze wiadomości, jeśli przekroczono limit
    if (this.messageHistory.length > this.maxHistoryLength) {
      // Jeśli pierwsza wiadomość jest systemowa, zachowaj ją
      const startIndex = this.messageHistory[0].role === 'system' ? 1 : 0;
      this.messageHistory = this.messageHistory.slice(startIndex);
    }
  }

  /**
   * Czyści historię komunikatów
   */
  public clearHistory(): void {
    this.messageHistory = [];
    this.logger.debug('Wyczyszczono historię komunikatów');
  }

  /**
   * Zwraca historię komunikatów
   */
  public getHistory(): ChatMessage[] {
    return this.messageHistory;
  }

  /**
   * Wysyła komunikat do API i zwraca przetworzoną odpowiedź wraz z danymi o zużyciu tokenów.
   * @template T - Oczekiwany typ sparsowanej odpowiedzi (content)
   * @param userMessage - Komunikat od użytkownika (opcjonalny, jeśli ustawiono wcześniej)
   * @returns Obiekt zawierający sparsowaną odpowiedź i zużycie tokenów
   */
  public async sendChatMessage<T>(userMessage?: string): Promise<ChatCompletionResult<T>> {
    if (userMessage) {
      this.currentUserMessage = userMessage;
    }
    
    if (!this.currentUserMessage) {
      const error = new Error('Nie ustawiono komunikatu użytkownika');
      this.logger.error(error.message);
      throw error;
    }

    try {
      // Dodaj wiadomość użytkownika do historii
      this.addMessageToHistory('user', this.currentUserMessage);

      const requestPayload = this.buildRequestPayload();
      this.logger.debug('Wysyłanie żądania do API z ładunkiem:', this.maskSensitiveDataInPayload(requestPayload));
      
      const apiResponse = await this.executeRequest(requestPayload);
      this.logger.debug('Otrzymano odpowiedź z API:', apiResponse);
      
      if (!apiResponse.choices || apiResponse.choices.length === 0 || !apiResponse.choices[0].message) {
        this.logger.error('Nieprawidłowa struktura odpowiedzi API: brak choices lub message');
        throw new NoResponseError('Nieprawidłowa struktura odpowiedzi API');
      }

      const assistantMessage = apiResponse.choices[0].message.content;
      this.addMessageToHistory('assistant', assistantMessage);

      let parsedContent: T;
      try {
        // Zakładamy, że jeśli typ generyczny T nie jest prostym stringiem,
        // to oczekiwany jest JSON. AIService używa T = {flashcards: ...}
        // i jego prompt systemowy instruuje model do zwracania JSON.
        // Dlatego zawsze próbujemy parsować odpowiedź.
        this.logger.debug(`Próba parsowania odpowiedzi jako JSON. Treść (max 200 znaków): "${assistantMessage.substring(0,200)}"`);
        parsedContent = JSON.parse(assistantMessage) as T;
        this.logger.debug('Pomyślnie sparsowano zawartość odpowiedzi jako JSON.');
      } catch (error) {
        this.logger.error(`Błąd podczas parsowania odpowiedzi JSON. Otrzymana treść (max 200 znaków): "${assistantMessage.substring(0,200)}"`, error);
        
        let detail = 'Sprawdzenie, czy model zwrócił poprawny JSON.';
        // Sprawdzenie, czy currentResponseFormat było ustawione, może dać dodatkowy kontekst
        if (this.currentResponseFormat && this.currentResponseFormat.name === 'json_object') {
            detail += ' Tryb json_object był włączony.';
        } else if (this.currentResponseFormat) {
            detail += ` Tryb response_format był ustawiony (name: ${this.currentResponseFormat.name}), ale nie jako 'json_object'.`;
        } else {
            detail += ' Żaden konkretny response_format nie był ustawiony (poleganie na prompcie).';
        }
        throw new ResponseProcessingError(`Błąd podczas przetwarzania odpowiedzi JSON z API. ${detail} Otrzymana treść (max 100 znaków): "${assistantMessage.substring(0,100)}"`);
      }

      return {
        response: parsedContent,
        usage: apiResponse.usage,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const responseError = new ResponseProcessingError(`Nieprawidłowa struktura odpowiedzi: ${error.message}`);
        this.logger.error(responseError.message);
        throw responseError;
      }
      
      if (error instanceof NoResponseError || 
          error instanceof ResponseProcessingError || 
          error instanceof AuthenticationError || 
          error instanceof RateLimitError) {
        this.logger.error(`${error.name}: ${error.message}`);
        throw error;
      }
      
      const genericError = new Error(
        `Błąd przetwarzania odpowiedzi: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(genericError.message);
      throw genericError;
    }
  }

  /**
   * Buduje ładunek żądania do API
   */
  private buildRequestPayload(): RequestPayload {
    const messages: ChatMessage[] = [];
    
    // Jeśli mamy historię, użyj jej zamiast tylko bieżących wiadomości
    if (this.messageHistory.length > 0) {
      // Dodaj bieżący komunikat systemowy, jeśli istnieje i pierwsza wiadomość historii nie jest systemowa
      if (this.currentSystemMessage && 
         (this.messageHistory.length === 0 || this.messageHistory[0].role !== 'system')) {
        messages.push({
          role: 'system',
          content: this.currentSystemMessage
        });
      }
      
      // Dodaj historię
      messages.push(...this.messageHistory);
    } else {
      // Dodaj komunikat systemowy, jeśli istnieje
      if (this.currentSystemMessage) {
        messages.push({
          role: 'system',
          content: this.currentSystemMessage
        });
      }
      
      // Dodaj komunikat użytkownika
      messages.push({
        role: 'user',
        content: this.currentUserMessage
      });
    }
    
    // Utwórz podstawowy ładunek
    const payload: RequestPayload = {
      model: this.currentModelName || this.defaultModelName,
      messages
    };
    
    // Dodaj parametry modelu
    const modelParams = this.currentModelParameters || this.defaultModelParams;
    if (modelParams.temperature !== undefined) payload.temperature = modelParams.temperature;
    if (modelParams.top_p !== undefined) payload.top_p = modelParams.top_p;
    if (modelParams.frequency_penalty !== undefined) payload.frequency_penalty = modelParams.frequency_penalty;
    if (modelParams.presence_penalty !== undefined) payload.presence_penalty = modelParams.presence_penalty;
    if (modelParams.max_tokens !== undefined) payload.max_tokens = modelParams.max_tokens;
    
    // Dodaj format odpowiedzi, jeśli ustawiony
    if (this.currentResponseFormat) {
      payload.response_format = {
        type: 'json_schema',
        json_schema: this.currentResponseFormat.schema
      };
    }
    
    return payload;
  }

  /**
   * Maskuje dane wrażliwe w ładunku żądania
   */
  private maskSensitiveDataInPayload(payload: any): any {
    if (!this.maskSensitiveData) {
      return payload;
    }

    const masked = { ...payload };
    
    // Nie logujemy zawartości wiadomości, tylko ich obecność
    if (masked.messages) {
      masked.messages = masked.messages.map((msg: ChatMessage) => ({
        role: msg.role,
        content: `[${msg.content.length} znaków]`
      }));
    }
    
    return masked;
  }

  /**
   * Wykonuje żądanie HTTP do API OpenRouter z mechanizmem ponownych prób
   */
  private async executeRequest(requestPayload: RequestPayload): Promise<ApiResponse> {
    let lastError: Error | null = null;
    
    // Log z zanonimizowanymi danymi
    this.logger.debug(
      'Payload żądania:',
      this.maskSensitiveDataInPayload(requestPayload)
    );
    
    for (let attempt = 0; attempt < this.retries; attempt++) {
      if (attempt > 0) {
        this.logger.warn(`Ponowna próba (${attempt}/${this.retries - 1}) po wcześniejszym błędzie`);
      }
      
      try {
        console.log(`[OPENROUTER-SERVICE] Sending request to ${this.apiUrl}, model: ${requestPayload.model}`);
        console.log(`[OPENROUTER-SERVICE] Messages count: ${requestPayload.messages.length}`);
        
        if (requestPayload.response_format) {
          console.log(`[OPENROUTER-SERVICE] Using response_format type: ${requestPayload.response_format.type}`);
        }
        
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this._apiKey}`, // Używamy prawdziwego klucza, nie zamaskowanego
            'HTTP-Referer': 'https://flashcards-creator-app.com',
            'X-Title': 'Flashcards Creator App'
          },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(this.timeout)
        });
        
        console.log(`[OPENROUTER-SERVICE] Response status: ${response.status}`);
        
        const responseText = await response.text();
        console.log(`[OPENROUTER-SERVICE] Response body (first 100 chars): ${responseText.substring(0, 100)}...`);
        
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`[OPENROUTER-SERVICE] Error parsing JSON response:`, parseError);
          throw new Error(`Error parsing JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
        
        // Sprawdź, czy odpowiedź zawiera błąd
        if (parsedResponse.error) {
          console.error(`[OPENROUTER-SERVICE] API returned error:`, parsedResponse.error);
          
          if (parsedResponse.error.code === 401 || parsedResponse.error.code === 403) {
            throw new AuthenticationError(`Błąd autentykacji: ${JSON.stringify(parsedResponse.error)}`);
          } else if (parsedResponse.error.code === 429) {
            throw new RateLimitError(`Przekroczono limit zapytań: ${JSON.stringify(parsedResponse.error)}`);
          } else {
            throw new Error(`Błąd API: ${parsedResponse.error.message || JSON.stringify(parsedResponse.error)}`);
          }
        }
        
        // Obsługa różnych kodów błędów HTTP
        if (!response.ok) {
          const status = response.status;
          
          console.error(`[OPENROUTER-SERVICE] API error (${status}):`, parsedResponse);
          
          // Rozpoznawanie konkretnych błędów
          if (status === 401 || status === 403) {
            throw new AuthenticationError(`Błąd autentykacji: ${JSON.stringify(parsedResponse)}`);
          } else if (status === 429) {
            throw new RateLimitError(`Przekroczono limit zapytań: ${JSON.stringify(parsedResponse)}`);
          } else {
            throw new Error(`Błąd API (${status}): ${JSON.stringify(parsedResponse)}`);
          }
        }
        
        // Upewnij się, że mamy poprawną strukturę odpowiedzi
        const apiResponse = parsedResponse as ApiResponse;
        
        // Sprawdź, czy odpowiedź zawiera wymagane pola
        if (!apiResponse.choices || apiResponse.choices.length === 0 || !apiResponse.choices[0].message) {
          console.error(`[OPENROUTER-SERVICE] Invalid API response structure:`, apiResponse);
          throw new Error('Nieprawidłowa struktura odpowiedzi API');
        }
        
        this.logger.debug('Otrzymano odpowiedź API', {
          id: apiResponse.id || 'unknown',
          model: apiResponse.model || 'unknown',
          usage: apiResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        });
        
        console.log(`[OPENROUTER-SERVICE] Successfully received API response, ID: ${apiResponse.id || 'unknown'}`);
        console.log(`[OPENROUTER-SERVICE] Response model: ${apiResponse.model || 'unknown'}`);
        if (apiResponse.usage) {
          console.log(`[OPENROUTER-SERVICE] Tokens used: ${apiResponse.usage.total_tokens || 'unknown'}`);
        } else {
          console.log(`[OPENROUTER-SERVICE] Usage information not available`);
        }
        
        return apiResponse;
      } catch (error) {
        // Zapisz ostatni błąd
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.error(`[OPENROUTER-SERVICE] Error during attempt ${attempt + 1}:`, lastError);
        
        // Loguj błąd
        this.logger.error(
          `Błąd podczas próby ${attempt + 1}/${this.retries}: ${lastError.message}`
        );
        
        // Natychmiast propaguj błędy autentykacji i limitów - nie ma sensu ponownie próbować
        if (error instanceof AuthenticationError || error instanceof RateLimitError) {
          throw lastError;
        }
        
        // Jeśli to ostatnia próba, rzuć błąd
        if (attempt === this.retries - 1) {
          throw lastError;
        }
        
        // Oblicz czas oczekiwania przed następną próbą z wykładniczym backoff-em
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
        this.logger.info(`Oczekiwanie ${backoffTime}ms przed ponowną próbą`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
    
    // Ten kod nigdy nie powinien zostać wykonany, ale kompilatora TypeScript będzie zadowolony
    throw lastError || new Error('Nieznany błąd podczas wykonywania żądania');
  }
  
  /**
   * Tworzy schemat JSON dla fiszek na podstawie przekazanego szablonu
   */
  public static createFlashcardsSchema(): JSONSchema {
    return {
      name: "flashcards",
      schema: {
        type: "object",
        properties: {
          flashcards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" }
              },
              required: ["front", "back"]
            }
          }
        },
        required: ["flashcards"]
      }
    };
  }
}
