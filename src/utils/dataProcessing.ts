import { LIKERT_LABELS } from '../config';

const AGE_BINS = [0, 18, 25, 35, 45, 55, 65, Infinity];
const INCOME_BINS = [0, 30000, 60000, 90000, 120000, Infinity];

interface Response {
  likert?: number;
  age: number;
  income: number;
}

function getBinLabel(value: number, bins: number[], isIncome: boolean): string {
  for (let i = 0; i < bins.length - 1; i++) {
    if (value >= bins[i] && value < bins[i + 1]) {
      if (isIncome) {
        return bins[i + 1] === Infinity
          ? `$${bins[i].toLocaleString()}+`
          : `$${bins[i].toLocaleString()}-${(bins[i + 1] - 1).toLocaleString()}`;
      } else {
        return bins[i + 1] === Infinity
          ? `${bins[i]}+`
          : `${bins[i]}-${bins[i + 1] - 1}`;
      }
    }
  }
  return 'Unknown';
}

export function createPivotTable(responses: Response[], groupBy: 'age' | 'income') {
  const bins = groupBy === 'age' ? AGE_BINS : INCOME_BINS;
  const isIncome = groupBy === 'income';

  const pivotData: { [key: string]: { [key: string]: number } } = {};

  responses.forEach(response => {
    const binLabel = getBinLabel(response[groupBy], bins, isIncome);
    if (!pivotData[binLabel]) {
      pivotData[binLabel] = {};
      LIKERT_LABELS.forEach(label => pivotData[binLabel][label] = 0);
    }
    if (response.likert) {
      const likertLabel = LIKERT_LABELS[response.likert - 1];
      pivotData[binLabel][likertLabel]++;
    }
  });

  // Convert counts to percentages
  Object.keys(pivotData).forEach(bin => {
    const total = Object.values(pivotData[bin]).reduce((sum, count) => sum + count, 0);
    Object.keys(pivotData[bin]).forEach(label => {
      pivotData[bin][label] = pivotData[bin][label] / total;
    });
  });

  // Convert to array and sort
  const sortedData = Object.entries(pivotData).map(([name, data]) => ({
    name,
    ...data
  }));

  // Sort based on the groupBy variable
  if (groupBy === 'age') {
    sortedData.sort((a, b) => {
      const aAge = parseInt(a.name.split('-')[0]);
      const bAge = parseInt(b.name.split('-')[0]);
      return aAge - bAge;
    });
  } else {
    sortedData.sort((a, b) => {
      const aIncome = parseInt(a.name.replace(/\$|,|\+/g, ''));
      const bIncome = parseInt(b.name.replace(/\$|,|\+/g, ''));
      return aIncome - bIncome;
    });
  }

  return sortedData;
}

export function calculateOverallDistribution(responses: Response[]) {
  const distribution: { [key: string]: number } = {};
  LIKERT_LABELS.forEach(label => distribution[label] = 0);

  responses.forEach(response => {
    if (response.likert) {
      const likertLabel = LIKERT_LABELS[response.likert - 1];
      distribution[likertLabel]++;
    }
  });

  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  
  return {
    name: 'Distribution of Responses',
    ...Object.fromEntries(
      Object.entries(distribution).map(([label, count]) => [label, count / total])
    )
  };
}