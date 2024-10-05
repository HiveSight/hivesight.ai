import { PersonaData, ResponseType } from '../types';
import { queryOpenAI } from './openAIService';
import { ModelType } from '../config';

export async function generateResponses(
  question: string,
  responseTypes: ResponseType[],
  perspective: string,
  personas: PersonaData[],
  model: ModelType
) {
  console.log(`[Response Generation] Generating responses for ${personas.length} personas`);
  console.log(`[Response Generation] Question: "${question}"`);
  console.log(`[Response Generation] Response Types: ${responseTypes.join(', ')}`);
  console.log(`[Response Generation] Perspective: ${perspective}`);
  console.log(`[Response Generation] Model: ${model}`);

  const prompts = personas.map(persona => createPrompt(question, responseTypes, perspective, persona));
  console.log(`[Response Generation] Created ${prompts.length} prompts`);

  const responses = await queryOpenAI(prompts, model);
  console.log(`[Response Generation] Received ${responses.length} responses from OpenAI service`);

  const parsedResponses = personas.map((persona, index) => ({
    perspective,
    age: persona.age,
    income: persona.income,
    state: persona.state,
    ...parseResponse(responses[index].content, responseTypes),
  }));

  console.log(`[Response Generation] Parsed ${parsedResponses.length} responses`);
  return parsedResponses;
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