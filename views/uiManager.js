export class UIManager {
  constructor(elements, relationshipManager) {
    this.elements = elements;
    this.relationshipManager = relationshipManager;
    this.formatter = new Intl.NumberFormat("en-US");
  }

  showError(message) {
    this.elements.errorMessage.style.display = "block";
    this.elements.errorMessage.textContent = message;
  }

  showLoading(isLoading) {
    this.elements.loadingDiv.classList.toggle("active", isLoading);
    this.elements.analyzeButton.disabled = isLoading;
  }

  updateStats(stats) {
    if (!stats) return;

    this.elements.stats.maxTokens.textContent = this.formatter.format(
      stats.maxTokens
    );
    this.elements.stats.tokensLeft.textContent = this.formatter.format(
      stats.tokensLeft
    );
    this.elements.stats.tokensSoFar.textContent = this.formatter.format(
      stats.tokensSoFar
    );
    this.elements.stats.temperature.textContent = stats.temperature.toFixed(2);
    this.elements.stats.topK.textContent = this.formatter.format(stats.topK);
  }

  updateEntitiesList(entities, selectedEntity, onEntityClick) {
    this.elements.entitiesList.innerHTML = "";
    this.elements.entitiesContainer.classList.toggle(
      "active",
      entities.length > 0
    );

    // Sort entities by their counts in descending order
    entities.sort((a, b) => {
      const countA = this.relationshipManager.uniqueEntityCount.get(a) || 0;
      const countB = this.relationshipManager.uniqueEntityCount.get(b) || 0;
      return countB - countA;
    });

    entities.forEach((entity) => {
      const count = this.relationshipManager.uniqueEntityCount.get(entity) || 0;
      const button = document.createElement("button");
      button.textContent = `${entity} (${count})`;
      button.className = `entity-button ${
        selectedEntity === entity ? "active" : ""
      }`;
      button.onclick = () => onEntityClick(entity);
      this.elements.entitiesList.appendChild(button);
    });
  }

  updateStreamingOutput(text, autoScroll = true) {
    this.elements.streamingOutput.textContent = text;
    if (autoScroll) {
      this.elements.streamingOutput.scrollTop =
        this.elements.streamingOutput.scrollHeight;
    }
  }

  setDiagram(svgContent) {
    this.elements.diagram.innerHTML = svgContent;
    const svgElement = this.elements.diagram.querySelector("svg");
    if (svgElement) {
      svgElement.style.width = "100%";
      svgElement.style.height = "auto";
      svgElement.style.maxHeight = "500px";
    }
  }
}
