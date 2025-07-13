/**
 * Leonardo AI Video Generation Service
 * 
 * Provides text-to-video generation using Leonardo AI's Motion API
 * Cost-effective alternative to Runway ML ($9/month vs $3/min)
 * Better suited for clinical movement demonstrations
 */

import axios from 'axios';

interface LeonardoImageGenerationRequest {
  prompt: string;
  modelId?: string;
  width?: number;
  height?: number;
  num_images?: number;
  guidance_scale?: number;
  negative_prompt?: string;
  init_generation_image_id?: string;
  init_image_id?: string;
  init_strength?: number;
  scheduler?: string;
  seed?: number;
  presetStyle?: string;
  tiling?: boolean;
  public?: boolean;
  promptMagic?: boolean;
  controlNet?: boolean;
  controlNetType?: string;
}

interface LeonardoMotionRequest {
  imageId: string;
  motionStrength?: number; // 1-10 scale
}

interface LeonardoGenerationResponse {
  sdGenerationJob: {
    generationId: string;
    apiCreditCost: number;
  };
}

interface LeonardoMotionResponse {
  motionId: string;
  apiCreditCost: number;
}

interface LeonardoGenerationStatus {
  generations_by_pk: {
    id: string;
    status: 'PENDING' | 'COMPLETE' | 'FAILED';
    generated_images: Array<{
      id: string;
      url: string;
      likeCount: number;
      nsfw: boolean;
      motionMP4URL?: string;
      motionGIFURL?: string;
    }>;
    modelId: string;
    prompt: string;
    negativePrompt?: string;
    imageHeight: number;
    imageWidth: number;
    inferenceSteps: number;
    seed: number;
    public: boolean;
    scheduler: string;
    sdVersion: string;
    status: string;
    presetStyle?: string;
    initStrength?: number;
    guidanceScale: number;
    createdAt: string;
  };
}

export class LeonardoService {
  private apiKey: string;
  private baseUrl = 'https://cloud.leonardo.ai/api/rest/v1';

  constructor() {
    this.apiKey = process.env.LEONARDO_API_KEY || '';
    if (!this.apiKey) {
      console.warn('LEONARDO_API_KEY not found in environment variables');
    }
  }

  /**
   * Check if Leonardo AI service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate clinical movement video from text description
   */
  async generateClinicalVideo(
    clinicalDescription: string,
    movementType: 'shoulder_movement' | 'gait_analysis' | 'functional_movement' | 'spinal_movement' = 'functional_movement'
  ): Promise<{ videoUrl: string; taskId: string; cost: number }> {
    if (!this.isConfigured()) {
      throw new Error('Leonardo AI service is not configured. Please set LEONARDO_API_KEY environment variable.');
    }

    try {
      // Step 1: Generate base image from clinical description
      const enhancedPrompt = this.enhanceClinicalPrompt(clinicalDescription, movementType);
      const imageGeneration = await this.generateImage(enhancedPrompt);
      
      // Step 2: Poll for image completion
      const completedGeneration = await this.waitForImageGeneration(imageGeneration.sdGenerationJob.generationId);
      
      if (!completedGeneration.generated_images?.[0]) {
        throw new Error('Failed to generate base image for video');
      }

      const baseImageId = completedGeneration.generated_images[0].id;
      
      // Step 3: Apply motion to create video
      const motionStrength = this.getMotionStrengthForMovement(movementType);
      const motionGeneration = await this.generateMotion(baseImageId, motionStrength);
      
      // Step 4: Poll for motion video completion
      const videoResult = await this.waitForMotionGeneration(motionGeneration.motionId);
      
      const totalCost = imageGeneration.sdGenerationJob.apiCreditCost + motionGeneration.apiCreditCost;
      
      return {
        videoUrl: videoResult.motionMP4URL || videoResult.motionGIFURL || '',
        taskId: motionGeneration.motionId,
        cost: totalCost
      };
      
    } catch (error: any) {
      console.error('Leonardo AI video generation failed:', error);
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  /**
   * Generate image from text prompt
   */
  private async generateImage(prompt: string): Promise<LeonardoGenerationResponse> {
    const response = await axios.post(
      `${this.baseUrl}/generations`,
      {
        prompt,
        modelId: 'aa77f04e-3eec-4034-9c07-d0f619684628', // Leonardo Vision XL model - good for realistic humans
        width: 832,
        height: 1216, // Portrait orientation for human subjects
        num_images: 1,
        guidance_scale: 7,
        scheduler: 'DPM_SOLVER',
        promptMagic: true, // Enhanced prompt understanding
        public: false,
        negative_prompt: 'blurry, low quality, distorted, cartoon, anime, drawing, sketch, unrealistic proportions'
      } satisfies LeonardoImageGenerationRequest,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  /**
   * Generate motion video from image
   */
  private async generateMotion(imageId: string, motionStrength: number = 5): Promise<LeonardoMotionResponse> {
    const response = await axios.post(
      `${this.baseUrl}/generations-motion-svd`,
      {
        imageId,
        motionStrength,
        isPublic: false
      } satisfies LeonardoMotionRequest,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  /**
   * Wait for image generation to complete
   */
  private async waitForImageGeneration(generationId: string, maxWaitTime: number = 120000): Promise<LeonardoGenerationStatus['generations_by_pk']> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const response = await axios.get(
        `${this.baseUrl}/generations/${generationId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const generation = response.data.generations_by_pk;
      
      if (generation.status === 'COMPLETE') {
        return generation;
      } else if (generation.status === 'FAILED') {
        throw new Error(`Image generation failed: ${generationId}`);
      }
      
      // Wait 3 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    throw new Error(`Image generation timeout: ${generationId}`);
  }

  /**
   * Wait for motion generation to complete
   */
  private async waitForMotionGeneration(motionId: string, maxWaitTime: number = 180000): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const response = await axios.get(
        `${this.baseUrl}/generations-motion/${motionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const motion = response.data.motionGenerationById;
      
      if (motion.status === 'COMPLETE' && motion.motionMP4URL) {
        return motion;
      } else if (motion.status === 'FAILED') {
        throw new Error(`Motion generation failed: ${motionId}`);
      }
      
      // Wait 5 seconds before polling again (motion takes longer)
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error(`Motion generation timeout: ${motionId}`);
  }

  /**
   * Enhance clinical description for better video generation
   */
  private enhanceClinicalPrompt(clinicalDescription: string, movementType: string): string {
    const basePrompt = `Professional medical setting, physiotherapy clinic, ${clinicalDescription}`;
    
    const movementEnhancers = {
      shoulder_movement: 'patient demonstrating shoulder range of motion, overhead reach assessment, anatomically accurate human movement',
      gait_analysis: 'patient walking, gait assessment, side view, clinical walking pattern analysis',
      functional_movement: 'patient performing functional movement test, physiotherapy assessment, clinical evaluation',
      spinal_movement: 'patient demonstrating spinal flexibility, back movement assessment, postural evaluation'
    };

    const enhancer = movementEnhancers[movementType as keyof typeof movementEnhancers] || movementEnhancers.functional_movement;
    
    return `${basePrompt}, ${enhancer}, high quality, professional medical photography, well-lit clinical environment, realistic human anatomy, medical professional observing`;
  }

  /**
   * Get appropriate motion strength for movement type
   */
  private getMotionStrengthForMovement(movementType: string): number {
    const strengthMap = {
      shoulder_movement: 6, // Moderate motion for shoulder demonstrations
      gait_analysis: 8,     // Higher motion for walking
      functional_movement: 5, // Balanced motion for general assessments
      spinal_movement: 4      // Subtle motion for spinal movements
    };

    return strengthMap[movementType as keyof typeof strengthMap] || 5;
  }

  /**
   * Get generation status
   */
  async getGenerationStatus(generationId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Leonardo AI service is not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/generations/${generationId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return {
        status: response.data.generations_by_pk.status,
        progress: response.data.generations_by_pk.status === 'COMPLETE' ? 100 : 
                 response.data.generations_by_pk.status === 'PENDING' ? 50 : 0,
        videoUrl: response.data.generations_by_pk.generated_images?.[0]?.motionMP4URL,
        failure_reason: response.data.generations_by_pk.status === 'FAILED' ? 'Generation failed' : null
      };
    } catch (error: any) {
      console.error('Error checking Leonardo AI status:', error);
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  /**
   * Generate video from Virtual Patient data
   */
  async generatePatientVideo(
    patient: any,
    movementType: 'functional_movement' | 'shoulder_movement' | 'gait_analysis' = 'functional_movement',
    customPrompt?: string
  ): Promise<{ videoUrl: string; taskId: string; cost: number }> {
    let clinicalDescription = customPrompt;
    
    if (!clinicalDescription) {
      // Generate description from patient data
      const age = patient.age || 'middle-aged';
      const gender = patient.gender || 'adult';
      const complaint = patient.chief_complaint || 'movement limitation';
      const symptoms = patient.symptoms_description || 'difficulty with movement';
      
      clinicalDescription = `${age} year old ${gender} patient with ${complaint}. Clinical presentation: ${symptoms}. Patient demonstrates movement limitations during assessment.`;
    }

    return this.generateClinicalVideo(clinicalDescription, movementType);
  }

  /**
   * Check API credits and usage
   */
  async getUserInfo(): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Leonardo AI service is not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/me`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error getting Leonardo AI user info:', error);
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }
}

export const leonardoService = new LeonardoService();