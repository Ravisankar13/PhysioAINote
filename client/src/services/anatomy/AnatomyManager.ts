import { AnatomyRenderer } from './AnatomyRenderer';
import { ShoulderAnatomy } from './regions/ShoulderAnatomy';
import { RenderContext, AnatomyLayer, AnatomyRendererOptions } from './types';

export class AnatomyManager {
  private renderers: Map<string, AnatomyRenderer>;
  private activeRegions: Set<string>;
  private globalOptions: AnatomyRendererOptions;

  constructor() {
    this.renderers = new Map();
    this.activeRegions = new Set();
    this.globalOptions = {
      enabledLayers: new Set(['bones', 'muscles', 'ligaments']),
      showLabels: true,
      opacity: 1
    };

    // Initialize all region renderers
    this.initializeRenderers();
  }

  private initializeRenderers() {
    // Add shoulder renderer
    this.renderers.set('shoulder', new ShoulderAnatomy());
    
    // TODO: Add other regions as they're implemented
    // this.renderers.set('hip', new HipAnatomy());
    // this.renderers.set('spine', new SpineAnatomy());
    // this.renderers.set('elbow', new ElbowAnatomy());
    // this.renderers.set('wrist', new WristAnatomy());
    // this.renderers.set('ankle', new AnkleAnatomy());
    
    // Set knee as active by default (existing implementation)
    // We'll integrate the existing knee rendering later
    this.activeRegions.add('knee');
    this.activeRegions.add('shoulder'); // Also activate shoulder for testing
  }

  // Render all active regions
  render(context: RenderContext) {
    for (const regionId of this.activeRegions) {
      const renderer = this.renderers.get(regionId);
      if (renderer) {
        renderer.render(context);
      }
    }
  }

  // Enable/disable regions
  setActiveRegions(regions: string[]) {
    this.activeRegions.clear();
    regions.forEach(region => this.activeRegions.add(region));
  }

  // Add a single region
  activateRegion(regionId: string) {
    this.activeRegions.add(regionId);
  }

  // Remove a single region
  deactivateRegion(regionId: string) {
    this.activeRegions.delete(regionId);
  }

  // Toggle a region
  toggleRegion(regionId: string) {
    if (this.activeRegions.has(regionId)) {
      this.activeRegions.delete(regionId);
    } else {
      this.activeRegions.add(regionId);
    }
  }

  // Set global layer visibility
  setLayerVisibility(layer: AnatomyLayer, visible: boolean) {
    if (visible) {
      this.globalOptions.enabledLayers.add(layer);
    } else {
      this.globalOptions.enabledLayers.delete(layer);
    }
    
    // Update all renderers
    this.renderers.forEach(renderer => {
      renderer.setOptions({ enabledLayers: this.globalOptions.enabledLayers });
    });
  }

  // Toggle layer visibility
  toggleLayer(layer: AnatomyLayer) {
    if (this.globalOptions.enabledLayers.has(layer)) {
      this.globalOptions.enabledLayers.delete(layer);
    } else {
      this.globalOptions.enabledLayers.add(layer);
    }
    
    // Update all renderers
    this.renderers.forEach(renderer => {
      renderer.setOptions({ enabledLayers: this.globalOptions.enabledLayers });
    });
  }

  // Set label visibility
  setShowLabels(show: boolean) {
    this.globalOptions.showLabels = show;
    this.renderers.forEach(renderer => {
      renderer.setOptions({ showLabels: show });
    });
  }

  // Set global opacity
  setOpacity(opacity: number) {
    this.globalOptions.opacity = Math.max(0, Math.min(1, opacity));
    this.renderers.forEach(renderer => {
      renderer.setOptions({ opacity: this.globalOptions.opacity });
    });
  }

  // Get available regions
  getAvailableRegions(): string[] {
    return Array.from(this.renderers.keys());
  }

  // Get active regions
  getActiveRegions(): string[] {
    return Array.from(this.activeRegions);
  }

  // Get current options
  getOptions(): AnatomyRendererOptions {
    return { ...this.globalOptions };
  }

  // Check if a layer is enabled
  isLayerEnabled(layer: AnatomyLayer): boolean {
    return this.globalOptions.enabledLayers.has(layer);
  }

  // Check if a region is active
  isRegionActive(regionId: string): boolean {
    return this.activeRegions.has(regionId);
  }
}