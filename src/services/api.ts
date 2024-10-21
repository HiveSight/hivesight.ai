import { SimulationParams, ResponseData } from '../types';
import { selectDiversePersonas } from './perspectivesData';
import { generateResponses } from './responseGeneration';
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
  console.log(`[API Service] Starting response generation for hive size: ${hiveSize}`);
  console.log(`[API Service] Perspective: ${perspective}`);
  
  let personas: PersonaData[];
  if (perspective === 'sample_americans') {
    console.log(`[API Service] Selecting diverse personas with age range [${ageRange[0]}, ${ageRange[1]}] and income range [${incomeRange[0]}, ${incomeRange[1]}]`);
    personas = selectDiversePersonas(hiveSize, ageRange, incomeRange);
  } else {
    console.log(`[API Service] Using generic personas for non-sample_americans perspective`);
    personas = Array(hiveSize).fill({ age: 30, income: 50000, state: 'General' });
  }
  console.log(`[API Service] Created ${personas.length} personas`);

  const responses = await generateResponses(question, responseTypes, perspective, personas, model);
  console.log(`[API Service] Generated ${responses.length} responses`);

  return { question, responses };
}