/**
 * Skeleton Animation Controller
 * 
 * Manages the unified animation system for Virtual Patient InteractiveSkeleton.
 * Handles blending between AI-generated movement, real motion capture data, and fallback animations.
 */

import { SoapVirtualPatient, SoapNote } from "@shared/schema";
import { aiMovementGenerator, GeneratedMovementData } from "./aiMovementGenerator";

export type AnimationBlendMode = "text-only" | "motion-only" | "hybrid";

export interface AnimationFrame {
  timestamp: number;
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
}

export interface AnimationSequence {
  frames: AnimationFrame[];
  duration: number;
  metadata: {
    source: "ai-generated" | "motion-capture" | "hybrid";
    confidence: number;
    generatedAt: Date;
    lastUpdated: Date;
  };
}

export interface AnimationControllerState {
  currentSequence: AnimationSequence | null;
  blendMode: AnimationBlendMode;
  isPlaying: boolean;
  currentFrame: number;
  playbackSpeed: number;
  loop: boolean;
}

export class SkeletonAnimationController {
  private state: AnimationControllerState = {
    currentSequence: null,
    blendMode: "text-only",
    isPlaying: false,
    currentFrame: 0,
    playbackSpeed: 1.0,
    loop: true
  };

  /**
   * Generate complete animation sequence for virtual patient
   */
  async generateAnimationSequence(
    virtualPatient: SoapVirtualPatient,
    soapNote: SoapNote,
    blendMode: AnimationBlendMode = "text-only"
  ): Promise<AnimationSequence> {
    console.log('Generating animation sequence for virtual patient:', virtualPatient.id);
    
    this.state.blendMode = blendMode;
    
    switch (blendMode) {
      case "text-only":
        return await this.generateAIOnlyAnimation(soapNote);
        
      case "motion-only":
        return this.generateMotionOnlyAnimation(virtualPatient);
        
      case "hybrid":
        return await this.generateHybridAnimation(virtualPatient, soapNote);
        
      default:
        return await this.generateAIOnlyAnimation(soapNote);
    }
  }

  /**
   * Generate animation purely from SOAP text using AI
   */
  private async generateAIOnlyAnimation(soapNote: SoapNote): Promise<AnimationSequence> {
    try {
      const aiMovementData = await aiMovementGenerator.generateMovementFromSOAP(soapNote);
      
      return {
        frames: aiMovementData.frames,
        duration: this.calculateDuration(aiMovementData.frames),
        metadata: {
          source: "ai-generated",
          confidence: 0.8, // AI confidence
          generatedAt: new Date(),
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Error generating AI animation:', error);
      return this.getFallbackAnimation();
    }
  }

  /**
   * Use only real motion capture data
   */
  private generateMotionOnlyAnimation(virtualPatient: SoapVirtualPatient): AnimationSequence {
    const motionData = virtualPatient.motionCaptureData;
    
    if (!motionData?.landmarks) {
      console.warn('No motion capture data available, falling back to AI animation');
      return this.getFallbackAnimation();
    }

    const frames: AnimationFrame[] = motionData.landmarks.map(frameData => ({
      timestamp: frameData.timestamp,
      landmarks: frameData.landmarks
    }));

    return {
      frames,
      duration: this.calculateDuration(frames),
      metadata: {
        source: "motion-capture",
        confidence: 0.95, // High confidence for real data
        generatedAt: new Date(),
        lastUpdated: new Date()
      }
    };
  }

  /**
   * Blend AI-generated and real motion data
   */
  private async generateHybridAnimation(
    virtualPatient: SoapVirtualPatient,
    soapNote: SoapNote
  ): Promise<AnimationSequence> {
    try {
      // Get both data sources
      const aiData = await aiMovementGenerator.generateMovementFromSOAP(soapNote);
      const motionData = virtualPatient.motionCaptureData;

      if (!motionData?.landmarks) {
        // No motion data available, use AI only
        return await this.generateAIOnlyAnimation(soapNote);
      }

      // Blend the two data sources
      const blendedFrames = this.blendAnimationFrames(
        aiData.frames,
        motionData.landmarks.map(frameData => ({
          timestamp: frameData.timestamp,
          landmarks: frameData.landmarks
        }))
      );

      return {
        frames: blendedFrames,
        duration: this.calculateDuration(blendedFrames),
        metadata: {
          source: "hybrid",
          confidence: 0.9, // High confidence for hybrid approach
          generatedAt: new Date(),
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Error generating hybrid animation:', error);
      return this.getFallbackAnimation();
    }
  }

  /**
   * Blend AI and motion capture frames intelligently
   */
  private blendAnimationFrames(
    aiFrames: AnimationFrame[],
    motionFrames: AnimationFrame[]
  ): AnimationFrame[] {
    const maxFrames = Math.max(aiFrames.length, motionFrames.length);
    const blendedFrames: AnimationFrame[] = [];

    for (let i = 0; i < maxFrames; i++) {
      const aiFrame = aiFrames[i % aiFrames.length];
      const motionFrame = motionFrames[i % motionFrames.length];

      // Blend landmarks using weighted average
      const blendedLandmarks = aiFrame.landmarks.map((aiLandmark, landmarkIndex) => {
        const motionLandmark = motionFrame?.landmarks[landmarkIndex];
        
        if (!motionLandmark || motionLandmark.visibility < 0.5) {
          // Use AI data when motion data is not reliable
          return aiLandmark;
        }

        // Weight motion capture higher for visible landmarks
        const motionWeight = motionLandmark.visibility;
        const aiWeight = 1 - motionWeight;

        return {
          x: (motionLandmark.x * motionWeight) + (aiLandmark.x * aiWeight),
          y: (motionLandmark.y * motionWeight) + (aiLandmark.y * aiWeight),
          z: (motionLandmark.z * motionWeight) + (aiLandmark.z * aiWeight),
          visibility: Math.max(motionLandmark.visibility, aiLandmark.visibility)
        };
      });

      blendedFrames.push({
        timestamp: aiFrame.timestamp,
        landmarks: blendedLandmarks
      });
    }

    return blendedFrames;
  }

  /**
   * Update animation when SOAP text changes
   */
  async updateAnimationFromSOAPChanges(
    virtualPatient: SoapVirtualPatient,
    soapNote: SoapNote
  ): Promise<AnimationSequence> {
    console.log('Updating animation from SOAP changes for virtual patient:', virtualPatient.id);
    
    // Generate new AI animation based on updated SOAP
    const updatedAIData = await aiMovementGenerator.generateMovementFromSOAP(soapNote);
    
    if (this.state.blendMode === "motion-only") {
      // Don't update motion-only animations
      return this.state.currentSequence || this.getFallbackAnimation();
    }

    if (this.state.blendMode === "hybrid" && virtualPatient.motionCaptureData?.landmarks) {
      // Re-blend with existing motion data
      const motionFrames = virtualPatient.motionCaptureData.landmarks.map(frameData => ({
        timestamp: frameData.timestamp,
        landmarks: frameData.landmarks
      }));

      const blendedFrames = this.blendAnimationFrames(updatedAIData.frames, motionFrames);
      
      return {
        frames: blendedFrames,
        duration: this.calculateDuration(blendedFrames),
        metadata: {
          source: "hybrid",
          confidence: 0.9,
          generatedAt: new Date(),
          lastUpdated: new Date()
        }
      };
    }

    // Text-only mode - use pure AI animation
    return {
      frames: updatedAIData.frames,
      duration: this.calculateDuration(updatedAIData.frames),
      metadata: {
        source: "ai-generated",
        confidence: 0.8,
        generatedAt: new Date(),
        lastUpdated: new Date()
      }
    };
  }

  /**
   * Set animation blend mode and regenerate if needed
   */
  async setBlendMode(
    mode: AnimationBlendMode,
    virtualPatient: SoapVirtualPatient,
    soapNote: SoapNote
  ): Promise<AnimationSequence> {
    if (this.state.blendMode === mode) {
      return this.state.currentSequence || this.getFallbackAnimation();
    }

    this.state.blendMode = mode;
    const newSequence = await this.generateAnimationSequence(virtualPatient, soapNote, mode);
    this.state.currentSequence = newSequence;
    
    return newSequence;
  }

  /**
   * Get current animation state
   */
  getState(): AnimationControllerState {
    return { ...this.state };
  }

  /**
   * Control animation playback
   */
  play(): void {
    this.state.isPlaying = true;
  }

  pause(): void {
    this.state.isPlaying = false;
  }

  setFrame(frameIndex: number): void {
    if (this.state.currentSequence) {
      this.state.currentFrame = Math.max(0, Math.min(frameIndex, this.state.currentSequence.frames.length - 1));
    }
  }

  setPlaybackSpeed(speed: number): void {
    this.state.playbackSpeed = Math.max(0.1, Math.min(3.0, speed));
  }

  setLoop(loop: boolean): void {
    this.state.loop = loop;
  }

  /**
   * Calculate animation duration from frames
   */
  private calculateDuration(frames: AnimationFrame[]): number {
    if (frames.length === 0) return 0;
    return Math.max(...frames.map(f => f.timestamp));
  }

  /**
   * Generate fallback animation for error cases
   */
  private getFallbackAnimation(): AnimationSequence {
    // Simple breathing animation
    const frames: AnimationFrame[] = [];
    const frameCount = 60; // 2 seconds at 30 FPS
    
    for (let i = 0; i < frameCount; i++) {
      const timestamp = (i / frameCount) * 2000;
      const breathingPhase = Math.sin((i / frameCount) * Math.PI * 4) * 0.02;
      
      // Create basic standing pose with breathing
      const landmarks = Array.from({ length: 33 }, (_, index) => {
        const y = index < 11 ? 1.5 + breathingPhase : // Upper body breathing
                  index < 23 ? 1.0 : // Torso
                  index < 27 ? 0.0 : // Hips and knees
                  -0.8; // Ankles
        
        return {
          x: 0,
          y: y,
          z: 0,
          visibility: 0.8
        };
      });

      frames.push({ timestamp, landmarks });
    }

    return {
      frames,
      duration: 2000,
      metadata: {
        source: "ai-generated",
        confidence: 0.5,
        generatedAt: new Date(),
        lastUpdated: new Date()
      }
    };
  }
}

export const skeletonAnimationController = new SkeletonAnimationController();