document.addEventListener("DOMContentLoaded", async () => {
  const elements = {
    errorMessage: document.getElementById("error-message"),
    analyzeButton: document.getElementById("analyze"),
    loadingDiv: document.getElementById("loading"),
    diagram: document.getElementById("diagram"),
    streamingOutput: document.getElementById("streaming-output"),
    entitiesContainer: document.getElementById("entities-container"),
    entitiesList: document.querySelector(".entities-list"),
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
  let relationships = [];
  let uniqueEntities = new Set();
  let selectedEntity = null;

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

  // Relationship handling functions
  function parseRelationships(text) {
    const newRelationships = [];
    const lines = text.split("\n");

    for (const line of lines) {
      const match = line.match(/([^()]+?)\s+to\s+([^()]+?)\s*\(([^)]+)\)/i);
      if (match) {
        const entity1 = match[1].trim();
        const entity2 = match[2].trim();
        uniqueEntities.add(entity1);
        uniqueEntities.add(entity2);
        newRelationships.push({
          entity1,
          entity2,
          description: match[3].trim(),
        });
      }
    }

    return newRelationships;
  }

  function updateEntitiesList() {
    elements.entitiesList.innerHTML = "";
    elements.entitiesContainer.classList.toggle(
      "active",
      uniqueEntities.size > 0
    );

    Array.from(uniqueEntities)
      .sort()
      .forEach((entity) => {
        const button = document.createElement("button");
        button.textContent = entity;
        button.className = `entity-button ${
          selectedEntity === entity ? "active" : ""
        }`;
        button.onclick = () => showEntityRelationships(entity);
        elements.entitiesList.appendChild(button);
      });
  }

  function showEntityRelationships(entity) {
    selectedEntity = entity;
    updateEntitiesList(); // Update button states

    // Filter relationships for selected entity
    const relevantRelationships = relationships.filter(
      (rel) => rel.entity1 === entity || rel.entity2 === entity
    );

    let nomnomlCode = ""; //defaultStyle;

    relevantRelationships.forEach((rel) => {
      console.log(rel);
      const entity1Id = `e${simpleHash(rel.entity1)}`;
      const entity2Id = `e${simpleHash(rel.entity2)}`;
      const noteId = `n${simpleHash(rel.description)}`;

      nomnomlCode += `[<main id="${entity1Id}">${rel.entity1}] -> [<main id="${entity2Id}">${rel.entity2}]\n`;
      nomnomlCode += `[<main id="${entity1Id}">${rel.entity1}] -- [<note id="${noteId}">${rel.description}] -- [<main id="${entity2Id}">${rel.entity2}]\n`;
    });

    try {
      const svg = nomnoml.renderSvg(nomnomlCode);
      elements.diagram.innerHTML = svg;
    } catch (error) {
      console.error("Failed to render diagram:", error);
      elements.errorMessage.style.display = "block";
      elements.errorMessage.textContent = `Failed to render diagram: ${error.message}`;
    }
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  // Session management
  async function initializeSession() {
    try {
      const { defaultTopK, maxTopK, defaultTemperature } =
        await self.ai.languageModel.capabilities();

      elements.controls.sessionTemperature.value = 0.3; //defaultTemperature;
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

  // Main analysis function
  async function analyzePageContent() {
    try {
      // Reset state
      relationships = [];
      uniqueEntities = new Set();
      selectedEntity = null;
      elements.diagram.innerHTML = "";
      elements.entitiesContainer.classList.remove("active");

      // Update UI
      elements.loadingDiv.classList.add("active");
      elements.analyzeButton.disabled = true;
      elements.errorMessage.style.display = "none";
      elements.streamingOutput.style.display = "block";
      elements.streamingOutput.textContent = "";

      // Get page content
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const [{ result: pageContent }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => document.body.innerText,
      });

      // Split content into chunks
      const chunkSize = 3000;
      const chunks = [];
      for (let i = 0; i < pageContent.length; i += chunkSize) {
        chunks.push(pageContent.slice(i, i + chunkSize));
      }

      let allRelationshipsText = "";

      // Analyze each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const prompt = `
          Analyze this text chunk (${i + 1} of ${
          chunks.length
        }) and identify key relationships between entities.
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

        elements.streamingOutput.textContent += `\n\nAnalyzing chunk ${
          i + 1
        } of ${chunks.length}...\n`;

        // Process chunk
        const stream = await session.promptStreaming(prompt);
        let chunkResult = "";

        for await (const response of stream) {
          chunkResult = response;
          elements.streamingOutput.textContent =
            allRelationshipsText + `\n\nChunk ${i + 1} output:\n` + chunkResult;
          elements.streamingOutput.scrollTop =
            elements.streamingOutput.scrollHeight;
        }

        allRelationshipsText += `\n\nChunk ${i + 1} results:\n` + chunkResult;

        // Parse relationships from chunk
        const chunkRelationships = parseRelationships(chunkResult);
        relationships = [...relationships, ...chunkRelationships];
        updateEntitiesList();

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      elements.errorMessage.style.display = "block";
      elements.errorMessage.textContent = `Analysis failed: ${error.message} (${error.name})`;
    } finally {
      elements.loadingDiv.classList.remove("active");
      elements.analyzeButton.disabled = false;
      elements.streamingOutput.classList.add("active");
      updateStats();
    }
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

  // Event Listeners
  elements.analyzeButton.addEventListener("click", analyzePageContent);
  elements.controls.sessionTemperature.addEventListener("input", updateSession);
  elements.controls.sessionTopK.addEventListener("input", updateSession);

  // Initialize
  initializeSession();
});
