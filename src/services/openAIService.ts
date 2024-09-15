import axios from 'axios';
import { MODEL_MAP } from '../config';

// Define a type that matches the keys of MODEL_MAP
type ModelType = keyof typeof MODEL_MAP;

export async function queryOpenAI(prompt: string, model: ModelType): Promise<string> {
  if (!MODEL_MAP[model]) {
    throw new Error(`Invalid model: ${model}`);
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: MODEL_MAP[model],
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500, // Increased max_tokens for more detailed summaries
      },
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error querying OpenAI:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`OpenAI API error: ${error.response.status} - ${error.response.data.error.message}`);
    } else {
      throw new Error('An error occurred while querying OpenAI');
    }
  }
}