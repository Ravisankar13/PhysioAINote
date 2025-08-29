// WebXR Service for Phase 3 - 3D Anatomy Overlay
// Educational visualization using browser-based AR

interface AnatomyLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  color: string;
  modelUrl?: string;
}

interface ClinicalTest {
  name: string;
  description: string;
  videoUrl?: string;
  steps: string[];
}

export class WebXRAnatomyService {
  private xrSession: XRSession | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private anatomyLayers: Map<string, AnatomyLayer> = new Map();
  
  constructor() {
    this.initializeLayers();
  }
  
  private initializeLayers() {
    // Knee anatomy layers for educational visualization
    const layers: AnatomyLayer[] = [
      {
        id: 'bones',
        name: 'Skeletal System',
        visible: true,
        opacity: 1,
        color: '#f5f5dc', // Bone color
      },
      {
        id: 'ligaments',
        name: 'Ligaments (ACL, PCL, MCL, LCL)',
        visible: false,
        opacity: 0.8,
        color: '#ffcccb', // Light red
      },
      {
        id: 'menisci',
        name: 'Menisci (Medial & Lateral)',
        visible: false,
        opacity: 0.7,
        color: '#87ceeb', // Sky blue
      },
      {
        id: 'tendons',
        name: 'Tendons & Muscles',
        visible: false,
        opacity: 0.6,
        color: '#cd5c5c', // Indian red
      },
      {
        id: 'cartilage',
        name: 'Articular Cartilage',
        visible: false,
        opacity: 0.5,
        color: '#e0f7fa', // Light cyan
      },
      {
        id: 'vessels',
        name: 'Blood Vessels',
        visible: false,
        opacity: 0.4,
        color: '#ff6b6b', // Red for arteries
      }
    ];
    
    layers.forEach(layer => this.anatomyLayers.set(layer.id, layer));
  }
  
  // Check WebXR support
  async checkXRSupport(): Promise<{
    supported: boolean;
    immersiveAR: boolean;
    inline: boolean;
  }> {
    if (!('xr' in navigator)) {
      return { supported: false, immersiveAR: false, inline: false };
    }
    
    const xr = (navigator as any).xr;
    const immersiveAR = await xr.isSessionSupported('immersive-ar');
    const inline = await xr.isSessionSupported('inline');
    
    return {
      supported: true,
      immersiveAR,
      inline
    };
  }
  
  // Start WebXR session
  async startXRSession(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      const xrSupport = await this.checkXRSupport();
      
      if (!xrSupport.supported) {
        console.warn('WebXR not supported');
        return false;
      }
      
      const xr = (navigator as any).xr;
      
      // Try immersive-ar first, fallback to inline
      const sessionMode = xrSupport.immersiveAR ? 'immersive-ar' : 'inline';
      
      this.xrSession = await xr.requestSession(sessionMode, {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['dom-overlay', 'hit-test'],
        domOverlay: { root: document.body }
      });
      
      // Set up WebGL context
      this.gl = canvas.getContext('webgl2', { xrCompatible: true }) as WebGL2RenderingContext;
      
      if (!this.gl) {
        console.error('Failed to get WebGL2 context');
        return false;
      }
      
      // Configure XR session
      await this.gl.makeXRCompatible();
      this.xrSession.updateRenderState({
        baseLayer: new XRWebGLLayer(this.xrSession, this.gl)
      });
      
      // Start render loop
      this.startRenderLoop();
      
      return true;
    } catch (error) {
      console.error('Failed to start XR session:', error);
      return false;
    }
  }
  
  // Render loop for AR visualization
  private startRenderLoop() {
    if (!this.xrSession) return;
    
    const onXRFrame = (time: number, frame: XRFrame) => {
      const session = frame.session;
      session.requestAnimationFrame(onXRFrame);
      
      // Get pose
      const pose = frame.getViewerPose(session.renderState.baseLayer!.getViewport(0));
      
      if (pose) {
        // Render anatomy layers
        this.renderAnatomyLayers(frame, pose);
      }
    };
    
    this.xrSession.requestAnimationFrame(onXRFrame);
  }
  
  // Render anatomy layers in AR
  private renderAnatomyLayers(frame: XRFrame, pose: XRViewerPose) {
    if (!this.gl) return;
    
    // Clear canvas
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    
    // Render each visible layer
    this.anatomyLayers.forEach(layer => {
      if (layer.visible) {
        this.renderLayer(layer, pose);
      }
    });
  }
  
  // Render individual anatomy layer
  private renderLayer(layer: AnatomyLayer, pose: XRViewerPose) {
    // Simplified rendering - in production would load actual 3D models
    // For now, render colored overlays based on layer type
    
    if (!this.gl) return;
    
    // Set layer color and opacity
    const color = this.hexToRgb(layer.color);
    this.gl.clearColor(
      color.r / 255,
      color.g / 255,
      color.b / 255,
      layer.opacity
    );
    
    // Educational annotations
    this.addEducationalAnnotations(layer);
  }
  
  // Add educational annotations to layers
  private addEducationalAnnotations(layer: AnatomyLayer) {
    const annotations: Record<string, string[]> = {
      bones: [
        'Femur (thighbone)',
        'Tibia (shinbone)',
        'Patella (kneecap)',
        'Fibula (lateral bone)'
      ],
      ligaments: [
        'ACL - Prevents tibia sliding forward',
        'PCL - Prevents tibia sliding backward',
        'MCL - Stabilizes inner knee',
        'LCL - Stabilizes outer knee'
      ],
      menisci: [
        'Medial meniscus - C-shaped',
        'Lateral meniscus - O-shaped',
        'Shock absorption',
        'Load distribution'
      ],
      tendons: [
        'Quadriceps tendon',
        'Patellar tendon',
        'Hamstring tendons',
        'IT band'
      ],
      cartilage: [
        'Hyaline cartilage',
        'Smooth joint surface',
        'Reduces friction',
        'Enables smooth movement'
      ],
      vessels: [
        'Popliteal artery',
        'Genicular arteries',
        'Venous drainage',
        'Lymphatic vessels'
      ]
    };
    
    return annotations[layer.id] || [];
  }
  
  // Toggle layer visibility
  toggleLayer(layerId: string) {
    const layer = this.anatomyLayers.get(layerId);
    if (layer) {
      layer.visible = !layer.visible;
    }
  }
  
  // Set layer opacity
  setLayerOpacity(layerId: string, opacity: number) {
    const layer = this.anatomyLayers.get(layerId);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
    }
  }
  
  // Get clinical test recommendations
  getClinicalTests(symptoms: string[]): ClinicalTest[] {
    const tests: ClinicalTest[] = [];
    
    if (symptoms.includes('anterior_knee_pain')) {
      tests.push({
        name: 'Patellar Grind Test',
        description: 'Assess patellofemoral joint',
        steps: [
          'Patient supine with knee extended',
          'Apply pressure to patella',
          'Move patella in circular motion',
          'Positive if pain or crepitus'
        ]
      });
    }
    
    if (symptoms.includes('instability')) {
      tests.push({
        name: 'Lachman Test',
        description: 'Test ACL integrity',
        steps: [
          'Patient supine, knee at 20-30°',
          'Stabilize femur',
          'Pull tibia forward',
          'Assess endpoint and laxity'
        ]
      });
      
      tests.push({
        name: 'Pivot Shift Test',
        description: 'Dynamic ACL assessment',
        steps: [
          'Patient supine, knee extended',
          'Apply valgus and internal rotation',
          'Slowly flex knee',
          'Feel for subluxation/reduction'
        ]
      });
    }
    
    if (symptoms.includes('medial_pain')) {
      tests.push({
        name: 'McMurray Test',
        description: 'Meniscal assessment',
        steps: [
          'Patient supine',
          'Fully flex knee',
          'Rotate tibia and extend knee',
          'Positive if click or pain'
        ]
      });
      
      tests.push({
        name: 'Valgus Stress Test',
        description: 'MCL integrity',
        steps: [
          'Patient supine, knee at 30°',
          'Apply valgus stress',
          'Compare to other side',
          'Assess laxity and endpoint'
        ]
      });
    }
    
    return tests;
  }
  
  // Generate educational content
  generateEducationalContent(scanData: any): {
    anatomicalCorrelations: string[];
    clinicalTests: ClinicalTest[];
    differentialConsiderations: string[];
    educationalResources: string[];
  } {
    const content = {
      anatomicalCorrelations: [],
      clinicalTests: [],
      differentialConsiderations: [],
      educationalResources: []
    };
    
    // Analyze scan data and generate educational content
    if (scanData.regions) {
      scanData.regions.forEach((region: any) => {
        if (region.type === 'swelling' && region.location === 'medial') {
          content.anatomicalCorrelations.push(
            'Medial joint line - correlates with MCL and medial meniscus'
          );
          content.differentialConsiderations.push(
            'MCL sprain',
            'Medial meniscus tear',
            'Pes anserine bursitis'
          );
        }
      });
    }
    
    // Add clinical tests based on findings
    content.clinicalTests = this.getClinicalTests(['medial_pain', 'instability']);
    
    // Educational resources
    content.educationalResources = [
      'Knee Anatomy Atlas',
      'Clinical Examination Techniques',
      'Evidence-Based Assessment Protocols',
      'Physiotherapy Treatment Guidelines'
    ];
    
    return content;
  }
  
  // Clean up XR session
  async endXRSession() {
    if (this.xrSession) {
      await this.xrSession.end();
      this.xrSession = null;
      this.gl = null;
    }
  }
  
  // Utility function
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }
}

// Export singleton instance
export const webXRService = new WebXRAnatomyService();