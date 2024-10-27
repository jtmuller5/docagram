export const systemPrompt = `You are a helpful assistant that analyzes text to identify key entities and their relationships. 
For each relationship, explain the connection between entities in a clear and concise way. 
Focus on the most important and meaningful relationships.
Keep entity names concise and relationship descriptions brief but clear.
Only include relationships that are explicitly stated or strongly implied in the text.`;

export class AIService {
  constructor() {
    this.session = null;
    this.summarizeSession = null;
    this.isInitialized = false;
  }

/**
 * Checks the support for AI capabilities including language model and summarizer.
 *
 * @returns {Promise<Object>} An object containing the support status and availability of the language model and summarizer.
 * @returns {boolean} return.hasLanguageModel - Indicates if the language model is supported.
 * @returns {boolean} return.hasSummarizer - Indicates if the summarizer is supported.
 * @returns {string} return.languageModelStatus - The availability status of the language model.
 * @returns {string} return.summarizerStatus - The availability status of the summarizer.
 */
  async checkSupport() {
    try {
      const languageModelCapabilities =
        await self.ai?.languageModel?.capabilities();
      const summarizerCapabilities = await self.ai?.summarizer?.capabilities();

      return {
        hasLanguageModel: languageModelCapabilities?.available !== "no",
        hasSummarizer: summarizerCapabilities?.available !== "no",
        languageModelStatus: languageModelCapabilities?.available || "no",
        summarizerStatus: summarizerCapabilities?.available || "no",
      };
    } catch (error) {
      console.error("Error checking AI capabilities:", error);
      return {
        hasLanguageModel: false,
        hasSummarizer: false,
        languageModelStatus: "no",
        summarizerStatus: "no",
      };
    }
  }

  async initialize(temperature, topK) {
    try {
      // Clean up existing sessions
      await this.destroy();

      const support = await this.checkSupport();
      if (!support.hasLanguageModel) {
        throw new Error("Language model not available on this device");
      }

      // Initialize main analysis session
      this.session = await self.ai.languageModel.create({
        temperature,
        topK,
        systemPrompt,
        monitor: (m) => {
          m.addEventListener("downloadprogress", (e) => {
            console.log(
              `Language model download progress: ${e.loaded}/${e.total}`
            );
          });
        },
      });

      // Initialize summarizer if available
      if (support.hasSummarizer) {
        try {
          this.summarizeSession = await self.ai.summarizer.create();
          if (support.summarizerStatus === "after-download") {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(
                () => reject(new Error("Summarizer download timeout")),
                30000
              );
              this.summarizeSession.addEventListener(
                "downloadprogress",
                (e) => {
                  console.log(
                    `Summarizer download progress: ${e.loaded}/${e.total}`
                  );
                  if (e.loaded === e.total) {
                    clearTimeout(timeout);
                    resolve();
                  }
                }
              );
            });
          }
          await this.summarizeSession.ready;
        } catch (error) {
          console.warn("Failed to initialize summarizer:", error);
          this.summarizeSession = null;
        }
      }

      this.isInitialized = true;
      return this.session;
    } catch (error) {
      this.isInitialized = false;
      throw error;
    }
  }

  async summarizeContent(content, maxLength = 2000) {
    if (!content || content.length <= maxLength) {
      return content;
    }

    if (!this.summarizeSession) {
      return content;
    }

    try {
      const summary = await this.summarizeSession.summarize(content);
      return summary;
    } catch (error) {
      // If session is invalid, try to reinitialize summarizer
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        try {
          const support = await this.checkSupport();
          if (support.hasSummarizer) {
            this.summarizeSession = await self.ai.summarizer.create();
            return await this.summarizeSession.summarize(content);
          }
        } catch (reinitError) {
          console.warn("Failed to reinitialize summarizer:", reinitError);
        }
      }
      console.warn("Summarization failed, using original content:", error);
      return content;
    }
  }

  async streamAnalysis(chunk, chunkIndex, totalChunks) {
    if (!this.session) {
      throw new Error("Language model session not initialized");
    }

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

    try {
      return await this.session.promptStreaming(prompt);
    } catch (error) {
      // If session is invalid, try to reinitialize once
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        const capabilities = await this.getCapabilities();
        if (capabilities.available !== "no") {
          await this.initialize(this.session.temperature, this.session.topK);
          return await this.session.promptStreaming(prompt);
        }
      }
      throw error;
    }
  }

  async getCapabilities() {
    try {
      return await self.ai.languageModel.capabilities();
    } catch (error) {
      console.error("Error getting language model capabilities:", error);
      return { available: "no" };
    }
  }

  getSessionStats() {
    if (!this.session) return null;

    const { maxTokens, temperature, tokensLeft, tokensSoFar, topK } =
      this.session;
    return {
      maxTokens,
      temperature,
      tokensLeft,
      tokensSoFar,
      topK,
      hasSummarizer: !!this.summarizeSession,
      isInitialized: this.isInitialized,
    };
  }

  async destroy() {
    if (this.session) {
      try {
        await this.session.destroy();
      } catch (error) {
        console.warn("Error destroying language model session:", error);
      }
      this.session = null;
    }

    if (this.summarizeSession) {
      try {
        await this.summarizeSession.destroy();
      } catch (error) {
        console.warn("Error destroying summarizer session:", error);
      }
      this.summarizeSession = null;
    }

    this.isInitialized = false;
  }
}
