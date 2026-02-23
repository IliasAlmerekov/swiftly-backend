import OpenAI from "openai";

class OpenAILLMAdapter {
  constructor({ apiKey, client } = {}) {
    this.apiKey = apiKey;
    this.client = client || null;
  }

  getClient() {
    if (this.client) {
      return this.client;
    }

    if (!this.apiKey) {
      throw new Error("OpenAI API key is not configured");
    }

    this.client = new OpenAI({ apiKey: this.apiKey });
    return this.client;
  }

  async completeChat({
    model,
    messages,
    maxTokens,
    temperature,
    frequencyPenalty,
    presencePenalty,
  }) {
    const completion = await this.getClient().chat.completions.create({
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
