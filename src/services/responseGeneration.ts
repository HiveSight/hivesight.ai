import { PersonaData, ResponseType } from '../types';
import { queryOpenAI } from './openAIService';
import { ModelType } from '../config';

export async function generateResponse(
  question: string,
  responseTypes: ResponseType[],
  perspective: string,
  persona: PersonaData,
  model: ModelType
) {
  const prompt = createPrompt(question, responseTypes, perspective, persona);
  const response = await queryOpenAI(prompt, model);
  return {
    perspective,
    age: persona.age,
    income: persona.income,
    state: persona.state,
    ...parseResponse(response, responseTypes),
  };
}

function createPrompt(
  question: string,
  responseTypes: ResponseType[],
  perspective: string,
  persona: PersonaData
): string {
  let prompt = '';
  if (perspective === 'sample_americans') {
    prompt = `You are roleplaying as a ${persona.age}-year-old person from ${persona.state} with an annual income of $${persona.income}. `;
  } else if (perspective === 'general_gpt') {
    prompt = `You are an AI assistant providing a general perspective. `;
  } else {
    prompt = `You are roleplaying as a person with the following perspective: ${perspective}. `;
  }
  prompt += `Please respond to the following question from this perspective: "${question}" `;

  if (responseTypes.includes('open_ended') && responseTypes.includes('likert')) {
    prompt +=
      'First, provide a brief open-ended response. Then, on a scale of 1 to 5 (where 1 is strongly disagree and 5 is strongly agree), how much do you agree with the statement? Provide only the number for the Likert scale.';
  } else if (responseTypes.includes('open_ended')) {
    prompt += 'Provide a brief open-ended response.';
  } else if (responseTypes.includes('likert')) {
    prompt +=
      'On a scale of 1 to 5 (where 1 is strongly disagree and 5 is strongly agree), how much do you agree with the statement? Provide only the number.';
  }

  return prompt;
}

function parseResponse(response: string, responseTypes: ResponseType[]) {
  const result: { open_ended?: string; likert?: number } = {};

  if (responseTypes.includes('open_ended') && responseTypes.includes('likert')) {
    const parts = response.split(/\s*\d+\s*$/);
    if (parts.length > 1) {
      result.open_ended = parts[0].trim();
      result.likert = parseInt(response.match(/\d+$/)?.[0] ?? '0', 10);
    } else {
      result.open_ended = response;
    }
  } else if (responseTypes.includes('open_ended')) {
    result.open_ended = response;
  } else if (responseTypes.includes('likert')) {
    const match = response.match(/\d/);
    if (match) {
      result.likert = parseInt(match[0], 10);
    }
  }

  return result;
}