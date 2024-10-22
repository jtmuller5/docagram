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
  const defaultStyle = '';/* `
    #arrowSize: 1
    #spacing: 50
    #padding: 8
    #fontSize: 12
    #lineWidth: 2
    #edges: rounded
    #background: transparent
    #fill: #f1f3f5
  `; */

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

  function parseRelationshipsToNomnoml(relationshipText) {
    const relationships = [];
    const uniqueEntities = new Set();
    let entityCount = 0;
    let noteCount = 0;
    
    // Split into lines and process each relationship
    const lines = relationshipText.split('\n');
    for (const line of lines) {
      // Look for the pattern: Entity1 to Entity2 (Description)
      const match = line.match(/([^()]+?)\s+to\s+([^()]+?)\s*\(([^)]+)\)/i);
      if (match) {
        const entity1 = match[1].trim();
        const entity2 = match[2].trim();
        uniqueEntities.add(entity1);
        uniqueEntities.add(entity2);
        relationships.push({
          entity1,
          entity2,
          description: match[3].trim()
        });
      }
    }
  
    // Convert relationships to nomnoml syntax
    let nomnomlCode = "";
    const entityIds = new Map();
  
    // First add all unique entities with IDs
    for (const entity of uniqueEntities) {
      const entityId = `e${++entityCount}`;
      entityIds.set(entity, entityId);
      nomnomlCode += `[<main id="${entityId}">${entity}]\n`;
    }
    nomnomlCode += '\n';
  
    // Then add all relationships
    for (const rel of relationships) {
      const entity1Id = entityIds.get(rel.entity1);
      const entity2Id = entityIds.get(rel.entity2);
      
      // Add relationship arrow
      nomnomlCode += `[${rel.entity1}] -> [${rel.entity2}]\n`;
      
      // Add description note if present
      if (rel.description) {
        const noteId = `n${++noteCount}`;
        nomnomlCode += `[<note id="${noteId}">${rel.description}]\n`;
        nomnomlCode += `[${rel.entity1}] -- [${rel.description}] -- [${rel.entity2}]\n`;
      }
      
      nomnomlCode += '\n';
    }
  
    return nomnomlCode;
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
  
      // Split content into chunks
      const chunkSize = 3000;
      const chunks = [];
      for (let i = 0; i < pageContent.length; i += chunkSize) {
        chunks.push(pageContent.slice(i, i + chunkSize));
      }
  
      // Initialize complete nomnoml code with styles
      let completeNomnomlCode = defaultStyle + "\n";
      let allRelationshipsText = "";
  
      // Analyze each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const prompt = `
          Analyze this text chunk (${i + 1} of ${chunks.length}) and identify key relationships between entities.
          Express each relationship using this format: [First Entity] to [Second Entity] (Description of relationship)
  
          Format rules:
          1. Each line should be: Entity1 to Entity2 (Description)
          2. Keep entity names clear but concise
          3. Place the relationship description in parentheses
          4. Make descriptions brief and specific
          5. Find up to 3 key relationships from this chunk
          
          Examples:
          Google to Chrome Browser (develops and maintains the browser)
          Chrome to Web Extensions (provides platform and APIs)
          Microsoft to Windows (develops and distributes operating system)
          
          Only output the relationships, no additional text or explanation.
          Each relationship should be on its own line.
          
          Text chunk to analyze: ${chunk}
        `;
  
        elements.streamingOutput.textContent += `\n\nAnalyzing chunk ${i + 1} of ${chunks.length}...\n`;
        
        // Process the chunk
        const stream = await session.promptStreaming(prompt);
        let chunkResult = "";
        
        // Show streaming output for this chunk
        for await (const chunkResponse of stream) {
          chunkResult = chunkResponse;
          elements.streamingOutput.textContent = 
            allRelationshipsText + 
            `\n\nChunk ${i + 1} output:\n` + 
            chunkResult;
          elements.streamingOutput.scrollTop = elements.streamingOutput.scrollHeight;
        }
  
        // Store the complete response for this chunk
        allRelationshipsText += `\n\nChunk ${i + 1} results:\n` + chunkResult;
  
        // Convert chunk relationships to nomnoml and update diagram
        if (chunkResult.trim()) {
          const nomnomlCode = parseRelationshipsToNomnoml(chunkResult);
          completeNomnomlCode += nomnomlCode;
  
          // Try to render the current diagram state
          try {
            const svg = nomnoml.renderSvg(completeNomnomlCode);
            elements.diagram.innerHTML = svg;
          } catch (error) {
            console.error("Diagram render error:", error);
            // Continue processing even if this render fails
          }
        }
  
        // Brief pause between chunks
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
  
      // Final diagram render
      try {
        const svg = nomnoml.renderSvg(completeNomnomlCode);
        elements.diagram.innerHTML = svg;
  
        // Add click handlers to elements
        elements.diagram.querySelectorAll("g[data-name]").forEach((el) => {
          el.style.cursor = "pointer";
          el.onclick = (e) => {
            const name = e.currentTarget.getAttribute("data-name");
            console.log("Clicked:", name);
          };
        });
      } catch (error) {
        console.error("Failed to render final diagram:", error);
        elements.errorMessage.style.display = "block";
        elements.errorMessage.textContent = `Failed to render diagram: ${error.message}`;
      }
  
    } catch (error) {
      console.error("Analysis failed:", error);
      elements.errorMessage.style.display = "block";
      elements.errorMessage.textContent = `Analysis failed: ${error.message} (${error.name})`;
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
