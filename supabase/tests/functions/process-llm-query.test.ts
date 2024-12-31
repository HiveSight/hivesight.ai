import { assertEquals } from "https://deno.land/std@0.207.0/assert/mod.ts";
import { createClient } from '@supabase/supabase-js';
import { generatePrompt, parseResponse, handleRequest } from "../../functions/process-llm-query/index.ts";

// Helper function tests
Deno.test("generatePrompt - open ended only", () => {
  const { systemPrompt, userPrompt } = generatePrompt(
    "What is your opinion on remote work?",
    ["open_ended"],
    "general_gpt"
  );

  assertEquals(
    systemPrompt.includes("different perspectives"),
    true,
    "System prompt should mention perspectives"
  );
  assertEquals(
    userPrompt.includes("brief open-ended response"),
    true,
    "User prompt should request open-ended response"
  );
  assertEquals(
    userPrompt.includes("Likert scale"),
    false,
    "User prompt should not mention Likert scale"
  );
});

Deno.test("generatePrompt - Likert only", () => {
  const { systemPrompt, userPrompt } = generatePrompt(
    "Do you support remote work?",
    ["likert"],
    "general_gpt"
  );

  assertEquals(
    userPrompt.includes("Likert scale rating (1-5)"),
    true,
    "User prompt should request Likert rating"
  );
  assertEquals(
    userPrompt.includes("open-ended response"),
    false,
    "User prompt should not request open-ended response"
  );
});

Deno.test("generatePrompt - both response types", () => {
  const { userPrompt } = generatePrompt(
    "What are your thoughts on remote work?",
    ["open_ended", "likert"],
    "general_gpt"
  );

  assertEquals(
    userPrompt.includes("open-ended response"),
    true,
    "User prompt should request open-ended response"
  );
  assertEquals(
    userPrompt.includes("Likert scale rating"),
    true,
    "User prompt should request Likert rating"
  );
});

// Test response parsing
Deno.test("parseResponse - open ended", () => {
  const content = "Response: This is a test response about remote work.";
  const result = parseResponse(content, ["open_ended"]);

  assertEquals(
    result.open_ended,
    "This is a test response about remote work.",
    "Should extract open-ended response"
  );
  assertEquals(
    result.likert,
    undefined,
    "Should not include Likert rating"
  );
});

Deno.test("parseResponse - Likert", () => {
  const content = "Rating: 4";
  const result = parseResponse(content, ["likert"]);

  assertEquals(
    result.likert,
    4,
    "Should extract Likert rating"
  );
  assertEquals(
    result.open_ended,
    undefined,
    "Should not include open-ended response"
  );
});

Deno.test("parseResponse - combined response", () => {
  const content = "Response: This is a test response.\nRating: 5";
  const result = parseResponse(content, ["open_ended", "likert"]);

  assertEquals(
    result.open_ended,
    "This is a test response.",
    "Should extract open-ended response"
  );
  assertEquals(
    result.likert,
    5,
    "Should extract Likert rating"
  );
});

Deno.test("parseResponse - invalid Likert rating", () => {
  const content = "Rating: 6";
  const result = parseResponse(content, ["likert"]);

  assertEquals(
    result.likert,
    undefined,
    "Should reject invalid Likert rating"
  );
});

// New integration test with mocked OpenAI API
Deno.test("handleRequest - integration test", async () => {
    // Mock fetch for OpenAI API
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stub(globalThis, "fetch", () => 
      Promise.resolve(new Response(JSON.stringify({
        choices: [{
          message: {
            content: "Response: This is a mock response.\nRating: 4"
          }
        }]
      }), { status: 200 }))
    );
  
    try {
      const mockRequest = new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query_id: "test-id",
          prompt: "test question",
          response_types: ["open_ended", "likert"],
          hive_size: 1,
          perspective: "general_gpt",
          model: "gpt-4"
        })
      });
  
      const mockEnv = {
        SUPABASE_URL: "test_url",
        SUPABASE_SERVICE_ROLE_KEY: "test_key",
        OPENAI_API_KEY: "test_openai_key"
      };
  
      const response = await handleRequest(mockRequest, mockEnv);
      const data = await response.json();
  
      // Assert response structure
      assertEquals(response.status, 200);
      assertEquals(data.success, true);
      assertEquals(data.responses_count, 1);
  
      // Verify OpenAI API was called with correct parameters
      assertSpyCall(globalThis.fetch as any, 0, {
        args: [
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer test_openai_key"
            },
            body: JSON.stringify({
              model: "gpt-4",
              messages: [
                { role: "system", content: (globalThis.fetch as any).calls[0].args[1].body.messages[0].content },
                { role: "user", content: (globalThis.fetch as any).calls[0].args[1].body.messages[1].content }
              ],
              temperature: 1.0,
              max_tokens: 500
            })
          }
        ]
      });
  
    } finally {
      // Restore original fetch
      globalThis.fetch = originalFetch;
    }
  });