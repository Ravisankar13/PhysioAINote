import { AnatomicalStructure, RenderContext, AnatomyRegion, AnatomyRendererOptions } from './types';
import { getLandmarkPosition, isLandmarkVisible } from './utils/landmarkMapping';

export abstract class AnatomyRenderer {
  protected region: AnatomyRegion;
  protected options: AnatomyRendererOptions;

  constructor(region: AnatomyRegion, options?: Partial<AnatomyRendererOptions>) {
    this.region = region;
    this.options = {
      enabledLayers: new Set(['bones', 'muscles', 'ligaments'] as AnatomyLayer[]),
      showLabels: true,
      opacity: 1,
      ...options
    };
  }

  // Main render method
  render(context: RenderContext) {
    const { ctx, landmarks, width, height } = context;
    
    // Check if landmarks are available
    if (!landmarks || landmarks.length === 0) return;
    
    // Sort structures by layer for proper z-ordering
    const sortedStructures = [...this.region.structures].sort((a, b) => a.layer - b.layer);
    
    // Render each structure
    for (const structure of sortedStructures) {
      if (this.shouldRenderStructure(structure)) {
        this.renderStructure(structure, context);
      }
    }
    
    // Render labels if enabled
    if (this.options.showLabels) {
      this.renderLabels(context);
    }
  }

  // Check if structure should be rendered based on options
  protected shouldRenderStructure(structure: AnatomicalStructure): boolean {
    // Check if layer is enabled
    if (!this.options.enabledLayers.has('all')) {
      const layerMap: Record<string, string> = {
        'bone': 'bones',
        'muscle': 'muscles',
        'ligament': 'ligaments',
        'tendon': 'ligaments',
        'cartilage': 'bones'
      };
      
      const layer = layerMap[structure.type];
      if (layer && !this.options.enabledLayers.has(layer as any)) {
        return false;
      }
    }
    
    return structure.visible !== false;
  }

  // Render individual structure
  protected renderStructure(structure: AnatomicalStructure, context: RenderContext) {
    const { ctx } = context;
    
    ctx.save();
    ctx.globalAlpha = structure.opacity || this.options.opacity;
    
    switch (structure.renderMethod) {
      case 'path':
        this.renderPath(structure, context);
        break;
      case 'line':
        this.renderLine(structure, context);
        break;
      case 'polygon':
        this.renderPolygon(structure, context);
        break;
      case 'circle':
        this.renderCircle(structure, context);
        break;
    }
    
    ctx.restore();
  }

  // Abstract methods to be implemented by specific region renderers
  protected abstract renderPath(structure: AnatomicalStructure, context: RenderContext): void;
  protected abstract renderLine(structure: AnatomicalStructure, context: RenderContext): void;
  protected abstract renderPolygon(structure: AnatomicalStructure, context: RenderContext): void;
  protected abstract renderCircle(structure: AnatomicalStructure, context: RenderContext): void;
  protected abstract renderLabels(context: RenderContext): void;

  // Helper method to check if all required landmarks are visible
  protected areLandmarksVisible(landmarks: any, indices: number[], threshold = 0.5): boolean {
    return indices.every(index => {
      const landmark = landmarks[index];
      return landmark && landmark.visibility >= threshold;
    });
  }

  // Update options
  setOptions(options: Partial<AnatomyRendererOptions>) {
    this.options = { ...this.options, ...options };
  }

  // Get region info
  getRegion(): AnatomyRegion {
    return this.region;
  }
}