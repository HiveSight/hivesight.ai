interface SimulationParams {
    question: string;
    responseTypes: string[];
    hiveSize: number;
    perspectives: string[];
  }
  
  export function getMockResponses({ question, responseTypes, hiveSize, perspectives }: SimulationParams) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const responses = generateMockResponses(hiveSize, responseTypes, perspectives);
        resolve({ question, responses });
      }, 1000); // Simulate 1-second API call
    });
  }
  
  function generateMockResponses(hiveSize: number, responseTypes: string[], perspectives: string[]) {
    const responses = [];
    for (let i = 0; i < hiveSize; i++) {
      const response: any = { perspective: getRandomPerspective(perspectives) };
      if (responseTypes.includes('open_ended')) {
        response.open_ended = `Mock open-ended response #${i + 1} from ${response.perspective}.`;
      }
      if (responseTypes.includes('likert')) {
        response.likert = getRandomLikertScore();
      }
      responses.push(response);
    }
    return responses;
  }
  
  function getRandomPerspective(perspectives: string[]) {
    return perspectives[Math.floor(Math.random() * perspectives.length)];
  }
  
  function getRandomLikertScore() {
    return Math.floor(Math.random() * 5) + 1; // Random number between 1 and 5
  }