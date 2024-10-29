export class RelationshipManager {
  constructor() {
    this.relationships = [];
    this.uniqueEntities = new Map(); // Map to store entity->URL mapping
    this.selectedEntity = null;
    this.uniqueEntityCount = new Map(); // Map to store entity->count mapping
  }

  parseRelationships(text, sourceUrl) {
    const newRelationships = [];
    const lines = text.split("\n");

    for (const line of lines) {
      const match = line.match(/([^()]+?)\s+to\s+([^()]+?)\s*\(([^)]+)\)/i);
      if (match) {
        const entity1 = match[1].trim();
        const entity2 = match[2].trim();

        // Increment entity count
        this.uniqueEntityCount.set(
          entity1,
          (this.uniqueEntityCount.get(entity1) || 0) + 1
        );
        this.uniqueEntityCount.set(
          entity2,
          (this.uniqueEntityCount.get(entity2) || 0) + 1
        );

        // Store entities with their source URL if they don't already exist
        if (!this.uniqueEntities.has(entity1)) {
          this.uniqueEntities.set(entity1, sourceUrl);
        }
        if (!this.uniqueEntities.has(entity2)) {
          this.uniqueEntities.set(entity2, sourceUrl);
        }

        newRelationships.push({
          entity1,
          entity2,
          description: match[3].trim(),
          sourceUrl,
        });
      }
    }

    this.relationships = [...this.relationships, ...newRelationships];
    return newRelationships;
  }

  reset() {
    this.relationships = [];
    this.uniqueEntities.clear();
    this.selectedEntity = null;
  }

  getRelationships() {
    return this.relationships;
  }

  getEntitiesList() {
    return Array.from(this.uniqueEntities.keys()).sort();
  }

  getEntitySource(entity) {
    return this.uniqueEntities.get(entity);
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

  exportToJson() {
    return {
      relationships: this.relationships,
      entities: Object.fromEntries(this.uniqueEntities),
      selectedEntity: this.selectedEntity,
    };
  }

  importFromJson(jsonData) {
    this.relationships = jsonData.relationships || [];
    this.uniqueEntities = new Map(Object.entries(jsonData.entities || {}));
    this.selectedEntity = jsonData.selectedEntity;
  }
}
