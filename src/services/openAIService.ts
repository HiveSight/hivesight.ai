import axios from 'axios';
import { MODEL_MAP, ModelType } from '../config';

interface OpenAIResponse {
  content: string;
}

interface Choice {
  message: {
    content: string;
  };
}

export async function queryOpenAI(prompt: string, model: ModelType, n: number = 1): Promise<OpenAIResponse[]> {
  if (!MODEL_MAP[model]) {
    throw new Error(`Invalid model: ${model}`);
  }

  console.log(`[OpenAI Service] Making API call with prompt using model ${model}, n=${n}`);

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: MODEL_MAP[model],
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.0,
        max_tokens: 500,
        n: n,
      },
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    console.log(`[OpenAI Service] Received ${response.data.choices.length} response(s) from API`);

    return response.data.choices.map((choice: Choice) => ({
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