export interface AnatomicalStructure {
  id: string;
  type: 'bone' | 'muscle' | 'ligament' | 'tendon' | 'cartilage';
  name: string;
  landmarks: number[]; // MediaPipe landmark indices
  renderMethod: 'path' | 'line' | 'polygon' | 'circle';
  color: string;
  layer: number; // For z-ordering
  visible?: boolean;
  opacity?: number;
}

export interface AnatomyRegion {
  id: string;
  name: string;
  structures: AnatomicalStructure[];
  landmarks: number[]; // All landmarks used by this region
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  landmarks: any; // MediaPipe landmarks
  width: number;
  height: number;
  scale?: number;
}

export type AnatomyLayer = 'bones' | 'muscles' | 'ligaments' | 'all';

export interface AnatomyRendererOptions {
  enabledLayers: Set<AnatomyLayer>;
  selectedRegion?: string;
  showLabels: boolean;
  opacity: number;
}