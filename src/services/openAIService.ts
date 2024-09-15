import axios from 'axios';
import { MODEL_MAP } from '../config';

export async function queryOpenAI(prompt: string, model: string): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: MODEL_MAP[model],
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
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