export class ContentService {
    static async getPageContent() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: function (node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
  
                if (parent.offsetHeight === 0) return NodeFilter.FILTER_REJECT;
  
                const tag = parent.tagName.toLowerCase();
                if (tag === "script" || tag === "style")
                  return NodeFilter.FILTER_REJECT;
  
                return NodeFilter.FILTER_ACCEPT;
              },
            }
          );
  
          let text = "";
          let node;
          while ((node = walker.nextNode())) {
            text += node.textContent + " ";
          }
  
          return text.replace(/\s+/g, " ").trim();
        },
      });
  
      return result;
    }
  
    static splitIntoChunks(content, chunkSize = 3000) {
      const chunks = [];
      for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.slice(i, i + chunkSize));
      }
      return chunks;
    }
  }