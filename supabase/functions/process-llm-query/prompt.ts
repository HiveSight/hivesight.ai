// supabase/functions/process-llm-query/prompt.ts

import { GeneratedPrompts, ParsedResponse } from './types.ts';

export function generatePrompt(
  prompt: string,
  responseTypes: string[],
  perspective: string
): GeneratedPrompts {
  let systemPrompt = `You are helping analyze a question from different perspectives. `;
  
  if (perspective === 'sample_americans') {
    systemPrompt += `Respond as a typical American with the provided demographic information. `;
  }
  
  let userPrompt = `Question: "${prompt}"\n\n`;
  
  if (responseTypes.includes('open_ended') && responseTypes.includes('likert')) {
    userPrompt += `Please provide:\n1. A brief open-ended response (2-3 sentences)\n2. A Likert scale rating (1-5) where:\n1=Strongly Disagree\n2=Disagree\n3=Neutral\n4=Agree\n5=Strongly Agree\n\nFormat your response as:\nResponse: [Your open-ended response]\nRating: [1-5]`;
  } else if (responseTypes.includes('open_ended')) {
    userPrompt += `Please provide a brief open-ended response (2-3 sentences).`;
  } else if (responseTypes.includes('likert')) {
    userPrompt += `Please provide a Likert scale rating (1-5) where:\n1=Strongly Disagree\n2=Disagree\n3=Neutral\n4=Agree\n5=Strongly Agree\n\nFormat your response as:\nRating: [1-5]`;
  }
  
  return { systemPrompt, userPrompt };
}

export function parseResponse(content: string, responseTypes: string[]): ParsedResponse {
  const response: ParsedResponse = {};
  
  if (responseTypes.includes('open_ended')) {
    const openEndedMatch = content.match(/Response:\s*(.+?)(?=\nRating:|$)/s);
    if (openEndedMatch) {
      response.open_ended = openEndedMatch[1].trim();
    }
  }
  
  if (responseTypes.includes('likert')) {
    const likertMatch = content.match(/Rating:\s*(\d+)/);
    if (likertMatch) {
      const rating = parseInt(likertMatch[1]);
      if (rating >= 1 && rating <= 5) {
        response.likert = rating;
      }
    }
  }
  
  return response;
}