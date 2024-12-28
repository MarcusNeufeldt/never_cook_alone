export interface GeminiResponse {
  text: string;
  error?: string;
}

export interface RecipeImprovement {
  suggestion: string;
  reason: string;
}

export interface CookingTip {
  tip: string;
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}
