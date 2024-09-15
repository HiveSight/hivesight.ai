import { SimulationParams, ResponseData } from '../types';
import { selectDiversePersonas } from './perspectivesData';
import { generateResponse } from './responseGeneration';
import { PersonaData } from '../types';


export async function getResponses({
  question,
  responseTypes,
  hiveSize,
  perspective,
  ageRange,
  incomeRange,
  model
}: SimulationParams): Promise<ResponseData> {
  let personas;
  if (perspective === 'sample_americans') {
    personas = selectDiversePersonas(hiveSize, ageRange, incomeRange);
  } else {
    personas = Array(hiveSize).fill({ age: 30, income: 50000, state: 'General' });
  }

  const responses = await Promise.all(personas.map((persona: PersonaData) =>
    generateResponse(question, responseTypes, perspective, persona, model)
  ));

  return { question, responses };
}