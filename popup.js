document.addEventListener("DOMContentLoaded", async () => {
  const elements = {
    errorMessage: document.getElementById("error-message"),
    analyzeButton: document.getElementById("analyze"),
    loadingDiv: document.getElementById("loading"),
    diagram: document.getElementById("diagram"),
    streamingOutput: document.getElementById("streaming-output"),
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
    },
  };

  let session = null;

  // Check for AI support
  if (!self.ai?.languageModel) {
    elements.errorMessage.style.display = "block";
    elements.errorMessage.innerHTML = `Your browser doesn't support the Prompt API. Join the <a href="https://developer.chrome.com/docs/ai/built-in#get_an_early_preview">Early Preview Program</a> to enable it.`;
    elements.analyzeButton.disabled = true;
    return;
  }

  // Configure nomnoml styling
  const defaultStyle = `
    #arrowSize: 1
    #spacing: 50
    #padding: 8
    #fontSize: 12
    #lineWidth: 2
    #edges: rounded
    #background: transparent
    #fill: #f1f3f5
  `;

  function createNomnomlDiagram(relationships) {
    let nomnomlCode = defaultStyle + "\n";

    // Add each relationship
    relationships.forEach((rel, index) => {
      // Create unique IDs for entities and notes
      const entity1Id = `e${index}a`;
      const entity2Id = `e${index}b`;
      const noteId = `n${index}`;

      // Add entities as classes with proper id syntax
      nomnomlCode += `[<main id="${entity1Id}">${rel.entity1}|${
        rel.type || ""
      }]\n`;
      nomnomlCode += `[<main id="${entity2Id}">${rel.entity2}|${
        rel.type || ""
      }]\n`;

      // Add relationship arrow
      nomnomlCode += `[${entity1Id}] -> [${entity2Id}]\n`;

      // Add connection description as a note if it exists
      if (rel.connection) {
        nomnomlCode += `[<note id="${noteId}">${rel.connection}]\n`;
        // Connect note to first entity with dashed line
        nomnomlCode += `[${noteId}] -- [${entity1Id}]\n`;
      }
    });

    return nomnomlCode;
  }

  function renderDiagram(relationships) {
    console.log("Rendering diagram:", relationships);
    try {
      const nomnomlCode = createNomnomlDiagram(relationships);
      const svg = nomnoml.renderSvg(nomnomlCode);
      elements.diagram.innerHTML = svg;

      // Add click handlers to elements
      elements.diagram.querySelectorAll("g[data-name]").forEach((el) => {
        el.style.cursor = "pointer";
        el.onclick = (e) => {
          const name = e.currentTarget.getAttribute("data-name");
          console.log("Clicked:", name);
          // You can add more interactivity here
        };
      });
    } catch (error) {
      console.error("Failed to render diagram:", error);
      elements.errorMessage.style.display = "block";
      elements.errorMessage.textContent = `Failed to render diagram: ${error.message}`;
    }
  }

  function parseRelationships(analysisText) {
    const blocks = analysisText.split("\n\n").filter((block) => block.trim());
    const relationships = [];

    for (const block of blocks) {
      const lines = block.split("\n");
      const relationship = {};

      for (const line of lines) {
        if (line.startsWith("Entity 1:")) {
          relationship.entity1 = line.replace("Entity 1:", "").trim();
        } else if (line.startsWith("Entity 2:")) {
          relationship.entity2 = line.replace("Entity 2:", "").trim();
        } else if (line.startsWith("Connection:")) {
          relationship.connection = line.replace("Connection:", "").trim();
        } else if (line.startsWith("Type:")) {
          relationship.type = line.replace("Type:", "").trim();
        }
      }

      if (relationship.entity1 && relationship.entity2) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  // Initialize session settings
  async function initializeSession() {
    try {
      const { defaultTopK, maxTopK, defaultTemperature } =
        await self.ai.languageModel.capabilities();

      elements.controls.sessionTemperature.value = defaultTemperature;
      elements.controls.sessionTopK.value = defaultTopK;
      elements.controls.sessionTopK.max = maxTopK;

      await updateSession();
    } catch (error) {
      console.error("Failed to initialize session:", error);
      elements.errorMessage.style.display = "block";
      elements.errorMessage.textContent = `Failed to initialize AI: ${error.message}`;
    }
  }

  async function updateSession() {
    if (session) {
      session.destroy();
    }

    session = await self.ai.languageModel.create({
      temperature: Number(elements.controls.sessionTemperature.value),
      topK: Number(elements.controls.sessionTopK.value),
      systemPrompt: `You are a helpful assistant that analyzes text to identify key entities and their relationships. 
        For each relationship, explain the connection between entities in a clear and concise way. 
        Focus on the most important and meaningful relationships.`,
    });

    updateStats();
  }

  function updateStats() {
    if (!session) return;

    const { maxTokens, temperature, tokensLeft, tokensSoFar, topK } = session;
    const formatter = new Intl.NumberFormat("en-US");

    elements.stats.maxTokens.textContent = formatter.format(maxTokens);
    elements.stats.tokensLeft.textContent = formatter.format(tokensLeft);
    elements.stats.tokensSoFar.textContent = formatter.format(tokensSoFar);
    elements.stats.temperature.textContent = temperature.toFixed(2);
    elements.stats.topK.textContent = formatter.format(topK);
  }

  async function analyzePageContent() {
    try {
      elements.loadingDiv.classList.add("active");
      elements.analyzeButton.disabled = true;
      elements.errorMessage.style.display = "none";
      elements.streamingOutput.style.display = "block";
      elements.streamingOutput.textContent = ""; // Clear previous content

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const [{ result: pageContent }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => document.body.innerText,
      });

      const prompt = `
        Analyze this text and identify key entities and their relationships.
        For each relationship:
        1. List the two related entities
        2. Explain how they are connected
        3. Describe the nature of their relationship

        Format your response as a list of relationships where each relationship follows this structure:
        Entity 1: [name]
        Entity 2: [name]
        Connection: [brief explanation]
        Type: [relationship type]

        Identify up to 5 of the most important relationships.

        Examples:
        Entity 1: Apple
        Entity 2: iPhone
        Connection: Apple manufactures iPhone
        Type: Manufacturer

        Entity 1: Google
        Entity 2: Search Engine
        Connection: Google is a search engine
        Type: Classification
        
        Text to analyze: ${pageContent.substring(0, 3000)}

        Relationships:

        Entity 1:
      `;

      const stream = await session.promptStreaming(prompt);
      let analysisResult = "";

      // Show streaming output
      for await (const chunk of stream) {
        analysisResult = chunk;
        elements.streamingOutput.textContent = analysisResult;
        // Auto-scroll to bottom
        elements.streamingOutput.scrollTop =
          elements.streamingOutput.scrollHeight;
      }

      // Parse and render after stream completes
      const relationships = parseRelationships(analysisResult);
      renderDiagram(relationships);
    } catch (error) {
      console.error("Analysis failed:", error);
      elements.errorMessage.style.display = "block";
      elements.errorMessage.textContent = `Analysis failed: ${error.message}`;
    } finally {
      elements.loadingDiv.classList.remove("active");
      elements.analyzeButton.disabled = false;
      updateStats();
    }
  }

  // Event Listeners
  elements.analyzeButton.addEventListener("click", analyzePageContent);
  elements.controls.sessionTemperature.addEventListener("input", updateSession);
  elements.controls.sessionTopK.addEventListener("input", updateSession);

  // Initialize
  initializeSession();
});
