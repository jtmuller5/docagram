export class UIManager {
    constructor(elements) {
      this.elements = elements;
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
  
      this.elements.stats.maxTokens.textContent = this.formatter.format(stats.maxTokens);
      this.elements.stats.tokensLeft.textContent = this.formatter.format(stats.tokensLeft);
      this.elements.stats.tokensSoFar.textContent = this.formatter.format(stats.tokensSoFar);
      this.elements.stats.temperature.textContent = stats.temperature.toFixed(2);
      this.elements.stats.topK.textContent = this.formatter.format(stats.topK);
    }
  
    updateEntitiesList(entities, selectedEntity, onEntityClick) {
      this.elements.entitiesList.innerHTML = "";
      this.elements.entitiesContainer.classList.toggle("active", entities.length > 0);
  
      entities.forEach((entity) => {
        const button = document.createElement("button");
        button.textContent = entity;
        button.className = `entity-button ${selectedEntity === entity ? "active" : ""}`;
        button.onclick = () => onEntityClick(entity);
        this.elements.entitiesList.appendChild(button);
      });
    }
  
    updateStreamingOutput(text, autoScroll = true) {
      this.elements.streamingOutput.textContent = text;
      if (autoScroll) {
        this.elements.streamingOutput.scrollTop = this.elements.streamingOutput.scrollHeight;
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