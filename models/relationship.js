export class RelationshipManager {
    constructor() {
      this.relationships = [];
      this.uniqueEntities = new Set();
      this.selectedEntity = null;
    }
  
    parseRelationships(text) {
      const newRelationships = [];
      const lines = text.split("\n");
  
      for (const line of lines) {
        const match = line.match(/([^()]+?)\s+to\s+([^()]+?)\s*\(([^)]+)\)/i);
        if (match) {
          const entity1 = match[1].trim();
          const entity2 = match[2].trim();
          this.uniqueEntities.add(entity1);
          this.uniqueEntities.add(entity2);
          newRelationships.push({
            entity1,
            entity2,
            description: match[3].trim(),
          });
        }
      }
  
      this.relationships = [...this.relationships, ...newRelationships];
      return newRelationships;
    }
  
    reset() {
      this.relationships = [];
      this.uniqueEntities = new Set();
      this.selectedEntity = null;
    }
  
    getEntitiesList() {
      return Array.from(this.uniqueEntities).sort();
    }
  
    selectEntity(entity) {
      this.selectedEntity = entity;
      return this.getEntityRelationships(entity);
    }
  
    getEntityRelationships(entity) {
      return this.relationships.filter(
        (rel) => rel.entity1 === entity || rel.entity2 === entity
      );
    }
  }