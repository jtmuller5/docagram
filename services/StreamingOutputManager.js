export class StreamingOutputManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.content = "";
    this.setupContainer();
  }

  setupContainer() {
    this.container.className =
      "streaming-output font-mono text-sm p-4 bg-gray-50 border border-gray-200 rounded-lg h-64 overflow-y-auto";
  }

  formatChunkHeader(text) {
    if (text.startsWith("Analyzing chunk")) {
      return `<div class="text-blue-600 font-medium my-1 flex items-center gap-2">
          ${text}
          <div class="loading-spinner"></div>
        </div>`;
    }
    if (text.includes("results:") || text.includes("output:")) {
      return `<div class="font-semibold text-gray-700 mt-3 mb-1">${text}</div>`;
    }
    return `<div class="text-gray-600">${text}</div>`;
  }

  async update(newContent) {
    try {
      this.content = newContent;

      const formattedContent = this.content
        .split("\n")
        .map((line) => this.formatChunkHeader(line))
        .join("");

      this.container.innerHTML = formattedContent;
      this.container.scrollTop = this.container.scrollHeight;
    } catch (error) {
      console.error("Error updating content:", error);
    }
  }

  showError(error) {
    this.container.innerHTML = `<div class="text-red-500 font-medium">${error}</div>`;
  }

  clear() {
    this.content = "";
    this.container.innerHTML = "";
  }
}
