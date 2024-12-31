import { assertEquals } from "https://deno.land/std@0.207.0/assert/mod.ts";
import { generatePrompt, parseResponse } from "../../functions/process-llm-query/index.ts";

// Test prompt generation
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