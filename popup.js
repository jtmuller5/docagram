let session = null;

// DOM Elements
const elements = {
  errorMessage: document.getElementById("error-message"),
  analyzeButton: document.getElementById("analyze"),
  loadingDiv: document.getElementById("loading"),
  excalidrawContainer: document.getElementById("excalidraw-container"),
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

// Check for AI support
if (!self.ai?.languageModel) {
  elements.errorMessage.style.display = "block";
  elements.errorMessage.innerHTML = `Your browser doesn't support the Prompt API. If you're on Chrome, join the <a href="https://developer.chrome.com/docs/ai/built-in#get_an_early_preview">Early Preview Program</a> to enable it.`;
  elements.analyzeButton.disabled = true;
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

// Update session with current settings
async function updateSession() {
  if (session) {
    session.destroy();
  }

  session = await self.ai.languageModel.create({
    temperature: Number(elements.controls.sessionTemperature.value),
    topK: Number(elements.controls.sessionTopK.value),
    systemPrompt: `You are a helpful assistant that analyzes text to identify key entities and their relationships. For each relationship, explain the connection between entities in a clear and concise way. Focus on the most important and meaningful relationships.`
  });

  updateStats();
}

// Update stats display
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

// Analyze page content and generate relationship data
async function analyzePageContent() {
  try {
    elements.loadingDiv.classList.add("active");
    elements.analyzeButton.disabled = true;

    // Get page content via content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result: pageContent }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => document.body.innerText,
    });

    const prompt = `
      Analyze this text and identify the key entities and their relationships.
      For each relationship:
      1. List the two related entities
      2. Explain how they are connected
      3. Describe the nature of their relationship (e.g., depends on, influences, part of)

      Format your response as a list of relationships where each relationship follows this structure:
      Entity 1: [name]
      Entity 2: [name]
      Connection: [brief explanation]
      Type: [relationship type]

      Identify up to 5 of the most important relationships.
      
      Text to analyze: ${pageContent.substring(0, 3000)}
    `;

    // Get relationship analysis from AI
    const stream = await session.promptStreaming(prompt);
    let analysisResult = "";
    const resultContainer = document.createElement("div");
    elements.excalidrawContainer.innerHTML = "";
    elements.excalidrawContainer.appendChild(resultContainer);

    // Stream the results as they come in
    for await (const chunk of stream) {
      analysisResult = chunk;
      resultContainer.innerHTML = analysisResult
        .split("\n")
        .map(line => {
          // Add some basic formatting
          if (line.startsWith("Entity")) {
            return `<strong>${line}</strong>`;
          } else if (line.startsWith("Connection")) {
            return `<em>${line}</em>`;
          } else if (line.startsWith("Type")) {
            return `<span style="color: #666">${line}</span><hr>`;
          }
          return line;
        })
        .join("<br>");
    }

    // TODO: In the next step, we can parse this structured response
    // and use it to create an Excalidraw visualization where:
    // - Entities become rectangles/shapes
    // - Relationships become arrows
    // - Connection descriptions become labels
    // - Relationship types influence the arrow styles

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