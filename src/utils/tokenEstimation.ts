import { get_encoding } from '@dqbd/tiktoken';
import { MODEL_COST_MAP } from '../config';

let encoder: any = null;

// Define a type that matches the keys of MODEL_COST_MAP
type ModelType = keyof typeof MODEL_COST_MAP;

export async function initializeEncoder() {
  if (!encoder) {
    encoder = get_encoding("cl100k_base");
  }
}

export function estimateTokens(text: string): number {
  if (!encoder) {
    throw new Error('Encoder not initialized. Call initializeEncoder() first.');
  }
  return encoder.encode(text).length;
}

export function estimateCost(
  question: string,
  responseTypes: string[],
  hiveSize: number,
  model: ModelType,  // Use the defined type here
  maxTokens: number
): { inputTokens: number; outputTokens: number; totalCost: number } {
  if (!encoder) {
    throw new Error('Encoder not initialized. Call initializeEncoder() first.');
  }

  // Estimate input tokens
  const promptTokens = estimateTokens(createPrompt(question, responseTypes));
  const inputTokens = promptTokens * hiveSize;

  // Estimate output tokens
  const outputTokens = maxTokens * hiveSize;

  // Calculate cost
  const inputCost = (inputTokens * MODEL_COST_MAP[model].Input) / 1e6;
  const outputCost = (outputTokens * MODEL_COST_MAP[model].Output) / 1e6;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens,
    outputTokens,
    totalCost: Number(totalCost.toFixed(5)),
  };
}

function createPrompt(question: string, responseTypes: string[]): string {
  let prompt = `Please respond to the following question: "${question}" `;
  
  if (responseTypes.includes('open_ended') && responseTypes.includes('likert')) {
    prompt += "Provide a brief open-ended response and then rate on a scale of 1 to 5.";
  } else if (responseTypes.includes('open_ended')) {
    prompt += "Provide a brief open-ended response.";
  } else if (responseTypes.includes('likert')) {
    prompt += "Rate on a scale of 1 to 5.";
  }
  
  return prompt;
}