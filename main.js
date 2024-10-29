import { AIService, systemPrompt } from "./services/aiService.js";
import { ContentService } from "./services/contentService.js";
import { RelationshipManager } from "./models/relationship.js";
import { DiagramView } from "./views/diagramView.js";
import { UIManager } from "./views/uiManager.js";
import { StreamingOutputManager } from "./services/StreamingOutputManager.js";

document.addEventListener("DOMContentLoaded", async () => {
  const elements = {
    errorMessage: document.getElementById("error-message"),
    analyzeButton: document.getElementById("analyze"),
    loadingDiv: document.getElementById("loading"),
    diagram: document.getElementById("diagram"),
    streamingOutput: document.getElementById("streaming-output"),
    entitiesContainer: document.getElementById("entities-container"),
    entitiesList: document.querySelector(".entities-list"),
    summarizeCheckbox: document.getElementById("enable-summarize"),
    stats: {
      maxTokens: document.getElementById("max-tokens"),
      tokensLeft: document.getElementById("tokens-left"),
      tokensSoFar: document.getElementById("tokens-so-far"),
      temperature: document.getElementById("temperature"),
      topK: document.getElementById("top-k"),
    },
    controls: {
      sessionTemperature: document.getElementById("session-temperature"),
      sessionTopK: document.getElementById("session-top-k"),
      showNotes: document.getElementById("show-notes"),
    },
  };

  const aiService = new AIService();
  const relationshipManager = new RelationshipManager();
  const diagramView = new DiagramView();
  const uiManager = new UIManager(elements, relationshipManager);

  // Check AI support
  if (!(await aiService.checkSupport())) {
    uiManager.showError(
      `Your browser doesn't support the Prompt API. Join the <a href="https://developer.chrome.com/docs/ai/built-in#get_an_early_preview">Early Preview Program</a> to enable it.`
    );
    elements.analyzeButton.disabled = true;
    return;
  }

  async function initializeSession() {
    try {
      await aiService.initialize();

      // Get AI capabilities
      const { defaultTopK, maxTopK, defaultTemperature } =
        await aiService.getCapabilities();

      // Get saved settings with fallbacks that respect capabilities
      const settings = await chrome.storage.sync.get({
        temperature: defaultTemperature || 0.3,
        topK: defaultTopK || 40,
      });

      // Ensure topK doesn't exceed maximum
      const safeTopK = Math.min(settings.topK, maxTopK);

      // Update UI controls if they exist (for non-settings pages)
      if (elements?.controls) {
        elements.controls.sessionTemperature.value = settings.temperature;
        elements.controls.sessionTopK.value = safeTopK;
        elements.controls.sessionTopK.max = maxTopK;
      }

      // Create AI session with settings
      const session = await ai.languageModel.create({
        temperature: settings.temperature,
        topK: safeTopK,
        systemPrompt: systemPrompt,
      });

      return session;
    } catch (error) {
      console.error("Failed to initialize session:", error);
      uiManager?.showError?.(`Failed to initialize AI: ${error.message}`);
      throw error; // Re-throw so calling code can handle failure
    }
  }

  async function updateSession() {
    await aiService.initialize(
      Number(elements.controls.sessionTemperature.value),
      Number(elements.controls.sessionTopK.value)
    );
    uiManager.updateStats(aiService.getSessionStats());
  }

  function showEntityRelationships(entity) {
    const relationships = relationshipManager.selectEntity(entity);
    uiManager.updateEntitiesList(
      relationshipManager.getEntitiesList(),
      entity,
      showEntityRelationships
    );

    try {
      const svg = diagramView.renderDiagram(
        relationships,
        elements.controls.showNotes.checked
      );
      uiManager.setDiagram(svg);
    } catch (error) {
      console.error("Failed to render diagram:", error);
      uiManager.showError(`Failed to render diagram: ${error.message}`);
    }
  }

  async function analyzePageContent(options = { shouldSummarize: true }) {
    const outputManager = new StreamingOutputManager("streaming-output");

    try {
      relationshipManager.reset();
      uiManager.setDiagram("");
      uiManager.showLoading(true);
      outputManager.clear();

      let pageContent = await ContentService.getPageContent();

      // Optional summarization step
      if (options.shouldSummarize && pageContent.length > 2000) {
        outputManager.update("Summarizing content for analysis...\n");
        pageContent = await aiService.summarizeContent(pageContent);
        console.log("Summarized content:", pageContent);
        outputManager.update("Summarization complete. Starting analysis...\n");
      }

      const chunks = ContentService.splitIntoChunks(pageContent);
      let allRelationshipsText = "";

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await outputManager.update(
          allRelationshipsText +
            `\n\nAnalyzing chunk ${i + 1} of ${chunks.length}...\n`
        );

        // Yield control to update UI
        await new Promise((resolve) => setTimeout(resolve, 0));

        const stream = await aiService.streamAnalysis(chunk, i, chunks.length);
        let chunkResult = "";

        for await (const response of stream) {
          chunkResult = response;
          await outputManager.update(
            allRelationshipsText + `\n\nChunk ${i + 1} output:\n` + chunkResult
          );

          // Yield control to update UI
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        allRelationshipsText += `\n\nChunk ${i + 1} results:\n` + chunkResult;
        relationshipManager.parseRelationships(chunkResult);
        uiManager.updateEntitiesList(
          relationshipManager.getEntitiesList(),
          relationshipManager.selectedEntity,
          showEntityRelationships
        );

        // Yield control to update UI
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      outputManager.showError(
        `Analysis failed: ${error.message} (${error.name})`
      );
      uiManager.showError(`Analysis failed: ${error.message} (${error.name})`);
    } finally {
      uiManager.showLoading(false);
      elements.streamingOutput.classList.add("active");
      uiManager.updateStats(aiService.getSessionStats());
    }
  }

  function handleAnalyzeClick() {
    const shouldSummarize = elements.summarizeCheckbox.checked;
    analyzePageContent({ shouldSummarize });
  }

  // Event Listeners

  elements.analyzeButton.addEventListener("click", handleAnalyzeClick);
  elements.controls.showNotes.addEventListener("change", () => {
    if (relationshipManager.selectedEntity) {
      showEntityRelationships(relationshipManager.selectedEntity);
    }
  });
  elements.controls.sessionTopK.addEventListener("input", async () => {
    const newTopK = parseInt(elements.controls.sessionTopK.value, 10);
    elements.stats.topK.textContent = newTopK;

    // Save to storage
    await chrome.storage.sync.set({ topK: newTopK });

    updateSession();
  });

  elements.controls.sessionTemperature.addEventListener("input", async () => {
    const newTemp = parseFloat(elements.controls.sessionTemperature.value);
    elements.stats.temperature.textContent = newTemp;

    // Save to storage
    await chrome.storage.sync.set({ temperature: newTemp });

    updateSession();
  });

  // Initialize
  initializeSession();
});
