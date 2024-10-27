export const systemPrompt = `You are a helpful assistant that analyzes text to identify key entities and their relationships. 
          For each relationship, explain the connection between entities in a clear and concise way. 
          Focus on the most important and meaningful relationships.
          Keep entity names concise and relationship descriptions brief but clear.
          Only include relationships that are explicitly stated or strongly implied in the text.`;

export class AIService {
  constructor() {
    this.session = null;
  }

  async checkSupport() {
    return !!self.ai?.languageModel;
  }

  async initialize(temperature, topK) {
    if (this.session) {
      this.session.destroy();
    }

    console.log(
      "Initializing AIService session with temperature:",
      temperature,
      "and topK:",
      topK
    );
    this.session = await self.ai.languageModel.create({
      temperature,
      topK,
      systemPrompt: systemPrompt,
    });

    console.log(
      "AIService session initialized with temperature:",
      temperature,
      "and topK:",
      topK
    );

    return this.session;
  }

  async getCapabilities() {
    return await self.ai.languageModel.capabilities();
  }

  async streamAnalysis(chunk, chunkIndex, totalChunks) {
    const prompt = `
        Analyze this text chunk (${
          chunkIndex + 1
        } of ${totalChunks}) and identify key relationships between entities.
        Express each relationship using this format: [First Entity] to [Second Entity] (Description of relationship)
        
        Format rules:
        1. Each line should be: Entity1 to Entity2 (Description)
        2. Keep entity names clear but concise
        3. Place the relationship description in parentheses
        4. Make descriptions brief and specific
        5. Only include relationships that are clear and meaningful
        
        Examples:
        Google to Chrome Browser (develops and maintains the browser)
        Chrome to Web Extensions (provides platform and APIs)
        Microsoft to Windows (develops and distributes operating system)
        
        Only output the relationships, no additional text or explanation.
        Each relationship should be on its own line.
        
        Text chunk to analyze: ${chunk}
      `;

    return await this.session.promptStreaming(prompt);
  }

  getSessionStats() {
    if (!this.session) return null;
    const { maxTokens, temperature, tokensLeft, tokensSoFar, topK } =
      this.session;
    return { maxTokens, temperature, tokensLeft, tokensSoFar, topK };
  }
}
