import axios from 'axios';
import { MODEL_MAP, ModelType } from '../config';

interface OpenAIResponse {
  content: string;
}

export async function queryOpenAI(prompts: string | string[], model: ModelType): Promise<OpenAIResponse[]> {
  if (!MODEL_MAP[model]) {
    throw new Error(`Invalid model: ${model}`);
  }

  const promptArray = Array.isArray(prompts) ? prompts : [prompts];

  console.log(`[OpenAI Service] Making API call with ${promptArray.length} prompt(s) using model ${model}`);

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: MODEL_MAP[model],
        messages: promptArray.map(prompt => ({ role: 'user', content: prompt })),
        temperature: 0.7,
        max_tokens: 500,
        n: promptArray.length,
      },
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    console.log(`[OpenAI Service] Received ${response.data.choices.length} response(s) from API`);

    return response.data.choices.map((choice: any) => ({
      content: choice.message.content,
    }));
  } catch (error) {
    console.error('Error querying OpenAI:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error(`[OpenAI Service] API error: ${error.response.status} - ${error.response.data.error.message}`);
      throw new Error(`OpenAI API error: ${error.response.status} - ${error.response.data.error.message}`);
    } else {
      console.error('[OpenAI Service] An unknown error occurred while querying OpenAI');
      throw new Error('An error occurred while querying OpenAI');
    }
  }
}