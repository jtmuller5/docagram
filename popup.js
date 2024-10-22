let session = null;

// DOM Elements
const elements = {
  errorMessage: document.getElementById('error-message'),
  analyzeButton: document.getElementById('analyze'),
  loadingDiv: document.getElementById('loading'),
  excalidrawContainer: document.getElementById('excalidraw-container'),
  stats: {
    maxTokens: document.getElementById('max-tokens'),
    tokensLeft: document.getElementById('tokens-left'), 
    tokensSoFar: document.getElementById('tokens-so-far'),
    temperature: document.getElementById('temperature'),
    topK: document.getElementById('top-k')
  },
  controls: {
    sessionTemperature: document.getElementById('session-temperature'),
    sessionTopK: document.getElementById('session-top-k')
  }
};

// Check for AI support
if (!self.ai?.languageModel) {
  elements.errorMessage.style.display = 'block';
  elements.errorMessage.innerHTML = `Your browser doesn't support the Prompt API. If you're on Chrome, join the <a href="https://developer.chrome.com/docs/ai/built-in#get_an_early_preview">Early Preview Program</a> to enable it.`;
  elements.analyzeButton.disabled = true;
}

// Initialize session settings
async function initializeSession() {
  try {
    const { defaultTopK, maxTopK, defaultTemperature } = await self.ai.languageModel.capabilities();
    elements.controls.sessionTemperature.value = defaultTemperature;
    elements.controls.sessionTopK.value = defaultTopK;
    elements.controls.sessionTopK.max = maxTopK;
    await updateSession();
  } catch (error) {
    console.error('Failed to initialize session:', error);
    elements.errorMessage.style.display = 'block';
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
    topK: Number(elements.controls.sessionTopK.value)
  });
  
  updateStats();
}

// Update stats display
function updateStats() {
  if (!session) return;
  
  const { maxTokens, temperature, tokensLeft, tokensSoFar, topK } = session;
  const formatter = new Intl.NumberFormat('en-US');
  
  elements.stats.maxTokens.textContent = formatter.format(maxTokens);
  elements.stats.tokensLeft.textContent = formatter.format(tokensLeft);
  elements.stats.tokensSoFar.textContent = formatter.format(tokensSoFar);
  elements.stats.temperature.textContent = temperature.toFixed(2);
  elements.stats.topK.textContent = formatter.format(topK);
}

// Generate relationship diagram
async function analyzePageContent() {
  try {
    elements.loadingDiv.classList.add('active');
    elements.analyzeButton.disabled = true;

    // Get page content via content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result: pageContent }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => document.body.innerText
    });

    const prompt = `
      Analyze this text and create a mermaid flowchart diagram showing key relationships and concepts.
      Use clear, concise labels and show only the most important connections.
      Use flowchart TD syntax only.
      Format the response as a valid mermaid diagram.
      
      Text to analyze: ${pageContent.substring(0, 3000)}
    `;

    // Get diagram from AI
    const stream = await session.promptStreaming(prompt);
    let mermaidDiagram = '';

    for await (const chunk of stream) {
      mermaidDiagram = chunk;
    }

    // Extract just the mermaid diagram code
    const diagramMatch = mermaidDiagram.match(/```mermaid\n([\s\S]*?)```/) || 
                        mermaidDiagram.match(/flowchart TD\n([\s\S]*)/);
    
    if (!diagramMatch) {
      throw new Error('Failed to generate valid diagram');
    }

    const cleanDiagram = diagramMatch[1].trim();
    
    // Initialize Excalidraw with the diagram
    // Note: In a real implementation, you'd use mermaid-to-excalidraw here
    // For now we'll just show the diagram code
    elements.excalidrawContainer.textContent = cleanDiagram;

  } catch (error) {
    console.error('Analysis failed:', error);
    elements.errorMessage.style.display = 'block';
    elements.errorMessage.textContent = `Analysis failed: ${error.message}`;
  } finally {
    elements.loadingDiv.classList.remove('active');
    elements.analyzeButton.disabled = false;
    updateStats();
  }
}

// Event Listeners
elements.analyzeButton.addEventListener('click', analyzePageContent);

elements.controls.sessionTemperature.addEventListener('input', updateSession);
elements.controls.sessionTopK.addEventListener('input', updateSession);

// Initialize
initializeSession();