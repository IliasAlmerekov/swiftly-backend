import OpenAI from "openai";

class OpenAILLMAdapter {
  constructor({ apiKey, client } = {}) {
    this.client = client || new OpenAI({ apiKey });
  }

  async completeChat({
    model,
    messages,
    maxTokens,
    temperature,
    frequencyPenalty,
    presencePenalty,
  }) {
    const completion = await this.client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
    });

    return {
      content: completion.choices[0]?.message?.content || "",
      totalTokens: completion.usage?.total_tokens || 0,
    };
  }
}

export default OpenAILLMAdapter;

