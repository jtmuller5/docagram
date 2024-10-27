export class DiagramView {
    constructor() {
      this.defaultStyle = `
#arrowSize: 1
#spacing: 50
#padding: 8
#fontSize: 12
#lineWidth: 2
#edges: rounded
#background: transparent
#fill: #f1f3f5
      `;
    }
  
    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return hash.toString(16);
    }
  
    renderDiagram(relationships, showNotes = true) {
      let nomnomlCode = this.defaultStyle;
  
      relationships.forEach((rel) => {
        const entity1Id = `e${this.simpleHash(rel.entity1)}`;
        const entity2Id = `e${this.simpleHash(rel.entity2)}`;
        const noteId = `n${this.simpleHash(rel.description)}`;
     
        if (showNotes) {
          nomnomlCode += `[<main id="${entity1Id}">${rel.entity1}] - [<note id="${noteId}">${rel.description}] -> [<main id="${entity2Id}">${rel.entity2}]\n`;
        } else {
          nomnomlCode += `[<main id="${entity1Id}">${rel.entity1}] -> [<main id="${entity2Id}">${rel.entity2}]\n`;
        }
      });
  
      return nomnoml.renderSvg(nomnomlCode);
    }
  }