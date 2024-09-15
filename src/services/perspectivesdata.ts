import * as papa from 'papaparse';

interface Perspective {
  age: number;
  state: string;
  income: number;
  weight: number;
}

let perspectives: Perspective[] = [];

export async function loadPerspectives() {
  const response = await fetch('/perspectives.csv');
  const csv = await response.text();
  const result = papa.parse(csv, { header: true, dynamicTyping: true });
  perspectives = result.data as Perspective[];
}

export function selectDiversePersonas(
  num_queries: number,
  age_range: [number, number],
  income_range: [number, number]
): Perspective[] {
  const filtered = perspectives.filter(
    p => p.age >= age_range[0] && p.age <= age_range[1] &&
        p.income >= income_range[0] && p.income <= income_range[1]
  );

  const selected: Perspective[] = [];
  const totalWeight = filtered.reduce((sum, p) => sum + p.weight, 0);

  for (let i = 0; i < num_queries; i++) {
    let randomWeight = Math.random() * totalWeight;
    for (const persona of filtered) {
      randomWeight -= persona.weight;
      if (randomWeight <= 0) {
        selected.push(persona);
        break;
      }
    }
  }

  return selected;
}