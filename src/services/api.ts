import axios from 'axios';
import { MODEL_MAP } from '../config';
import { selectDiversePersonas } from './perspectivesData';

interface SimulationParams {
  question: string;
  responseTypes: string[];
  hiveSize: number;
  perspective: string;
  apiKey: string;
  ageRange: [number, number];
  incomeRange: [number, number];
}

export async function getResponses({ 
  question, 
  responseTypes, 
  hiveSize, 
  perspective, 
  apiKey,
  ageRange,
  incomeRange
}: SimulationParams) {
  let personas;
  if (perspective === 'sample_americans') {
    personas = selectDiversePersonas(hiveSize, ageRange, incomeRange);
  } else {
    personas = Array(hiveSize).fill({ age: 30, income: 50000, state: 'General' });
  }

  const responses = await Promise.all(personas.map(persona => 
    generateResponse(question, responseTypes, perspective, persona, apiKey)
  ));

  return { question, responses };
}

async function generateResponse(question: string, responseTypes: string[], perspective: string, persona: any, apiKey: string) {
  const prompt = createPrompt(question, responseTypes, perspective, persona);
  const response = await queryOpenAI(prompt, apiKey);
  return {
    perspective,
    age: persona.age,
    income: persona.income,
    state: persona.state,
    ...parseResponse(response, responseTypes)
  };
}

function createPrompt(question: string, responseTypes: string[], perspective: string, persona: any) {
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
    prompt += "First, provide a brief open-ended response. Then, on a scale of 1 to 5 (where 1 is strongly disagree and 5 is strongly agree), how much do you agree with the statement? Provide only the number for the Likert scale.";
  } else if (responseTypes.includes('open_ended')) {
    prompt += "Provide a brief open-ended response.";
  } else if (responseTypes.includes('likert')) {
    prompt += "On a scale of 1 to 5 (where 1 is strongly disagree and 5 is strongly agree), how much do you agree with the statement? Provide only the number.";
  }
  
  return prompt;
}

async function queryOpenAI(prompt: string, apiKey: string) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: MODEL_MAP['GPT-4o-mini'],
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error querying OpenAI:', error);
    throw error;
  }
}

function parseResponse(response: string, responseTypes: string[]) {
  const result: { open_ended?: string, likert?: number } = {};
  
  if (responseTypes.includes('open_ended') && responseTypes.includes('likert')) {
    const parts = response.split(/\s*\d+\s*$/);
    if (parts.length > 1) {
      result.open_ended = parts[0].trim();
      result.likert = parseInt(response.match(/\d+$/)[0], 10);
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