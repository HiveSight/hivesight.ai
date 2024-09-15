import axios from 'axios';
import { MODEL_MAP } from '../config';

interface SimulationParams {
  question: string;
  responseTypes: string[];
  hiveSize: number;
  perspectives: string[];
  apiKey: string;
  ageRange: [number, number];
  incomeRange: [number, number];
}

export async function getResponses({ 
  question, 
  responseTypes, 
  hiveSize, 
  perspectives, 
  apiKey,
  ageRange,
  incomeRange
}: SimulationParams) {
  const responses = [];
  for (let i = 0; i < hiveSize; i++) {
    const perspective = getRandomPerspective(perspectives);
    const age = getRandomInRange(ageRange[0], ageRange[1]);
    const income = getRandomInRange(incomeRange[0], incomeRange[1]);
    const prompt = createPrompt(question, responseTypes, perspective, age, income);
    const response = await queryOpenAI(prompt, apiKey);
    responses.push({
      perspective,
      age,
      income,
      ...parseResponse(response, responseTypes)
    });
  }
  return { question, responses };
}

function getRandomPerspective(perspectives: string[]) {
  return perspectives[Math.floor(Math.random() * perspectives.length)];
}

function getRandomInRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createPrompt(question: string, responseTypes: string[], perspective: string, age: number, income: number) {
  let prompt = `You are roleplaying as a ${age}-year-old person with an annual income of $${income} and the following perspective: ${perspective}. `;
  prompt += `Please respond to the following question from this perspective: "${question}" `;
  
  if (responseTypes.includes('open_ended')) {
    prompt += "Provide a brief open-ended response. ";
  }
  if (responseTypes.includes('likert')) {
    prompt += "On a scale of 1 to 5 (where 1 is strongly disagree and 5 is strongly agree), how much do you agree with the statement? ";
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
  
  if (responseTypes.includes('open_ended')) {
    result.open_ended = response.split('.')[0] + '.'; // Get first sentence
  }
  
  if (responseTypes.includes('likert')) {
    const match = response.match(/\d/);
    if (match) {
      result.likert = parseInt(match[0], 10);
    }
  }
  
  return result;
}