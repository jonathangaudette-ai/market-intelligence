import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testClaudeResponse() {
  console.log("Testing Claude Sonnet 4.5 JSON response format...\n");
  
  const testPrompt = `Analyze this short text and respond with ONLY valid JSON:

Text: "This is a competitive intelligence report about Company X's Q4 2024 performance."

Respond with this exact JSON structure:
\`\`\`json
{
  "documentType": "competitive_report",
  "language": "en",
  "confidence": 0.9
}
\`\`\`
`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1000,
    temperature: 0,
    messages: [{ role: "user", content: testPrompt }],
  });

  console.log("Full response structure:");
  console.log(JSON.stringify(response, null, 2));
  
  console.log("\n\nContent blocks:");
  for (const block of response.content) {
    console.log(`\nBlock type: ${block.type}`);
    if (block.type === "text") {
      console.log("Text content:");
      console.log(block.text);
      console.log("\nFirst 200 chars:", block.text.substring(0, 200));
      console.log("Last 200 chars:", block.text.substring(Math.max(0, block.text.length - 200)));
    }
  }
}

testClaudeResponse().catch(console.error);
