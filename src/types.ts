export type ResponseType = 'open_ended' | 'likert';

export interface SimulationParams {
  question: string;
  responseTypes: ResponseType[];
  hiveSize: number;
  perspective: string;
  ageRange: [number, number];
  incomeRange: [number, number];
  model: string;
}

export interface PersonaData {
  age: number;
  income: number;
  state: string;
}

export interface ResponseData {
  question: string;
  responses: Array<{
    perspective: string;
    age: number;
    income: number;
    state: string;
    open_ended?: string;
    likert?: number;
  }>;
}