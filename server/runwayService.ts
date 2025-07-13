/**
 * Runway ML Video Generation Service
 * Integrates with Runway ML API for text-to-video generation
 */

export interface RunwayVideoRequest {
  textPrompt: string;
  duration?: number; // seconds (5-10)
  seed?: number;
  watermark?: boolean;
}

export interface RunwayVideoResponse {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  output?: string[]; // Video URLs
  progress?: number;
  eta?: number;
  failure_reason?: string;
}

export class RunwayService {
  private apiKey: string;
  private baseUrl = 'https://api.runwayml.com/v1';

  constructor() {
    this.apiKey = process.env.RUNWAY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('RUNWAY_API_KEY not found in environment variables');
    }
  }

  /**
   * Generate a clinical movement video from text description
   */
  async generateClinicalVideo(
    textPrompt: string,
    options: Partial<RunwayVideoRequest> = {}
  ): Promise<RunwayVideoResponse> {
    if (!this.apiKey) {
      throw new Error('Runway ML API key not configured. Please add RUNWAY_API_KEY to environment variables.');
    }

    try {
      const enhancedPrompt = this.enhancePromptForClinicalUse(textPrompt);
      
      const requestBody = {
        model: 'gen3a_turbo',
        text_prompt: enhancedPrompt,
        duration: options.duration || 5, // 5 seconds default
        ratio: '16:9',
        seed: options.seed || Math.floor(Math.random() * 1000000),
        watermark: options.watermark !== false, // Default to true
      };

      console.log('Generating Runway ML video with prompt:', enhancedPrompt);

      const response = await fetch(`${this.baseUrl}/image_to_video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Runway ML API error (${response.status}): ${errorData}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Error generating Runway ML video:', error);
      throw new Error(`Failed to generate video: ${error.message}`);
    }
  }

  /**
   * Check the status of a video generation job
   */
  async getVideoStatus(taskId: string): Promise<RunwayVideoResponse> {
    if (!this.apiKey) {
      throw new Error('Runway ML API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Runway ML API error (${response.status}): ${errorData}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error checking Runway ML video status:', error);
      throw new Error(`Failed to check video status: ${error.message}`);
    }
  }

  /**
   * Enhance text prompt for clinical/physiotherapy use
   */
  private enhancePromptForClinicalUse(prompt: string): string {
    const clinicalEnhancements = [
      'professional medical demonstration',
      'clinical setting',
      'proper lighting',
      'clear movement patterns',
      'physiotherapy assessment',
      'realistic human anatomy',
      'medical accuracy'
    ];

    // Check if prompt already contains clinical terms
    const hasClinicaLTerms = clinicalEnhancements.some(term => 
      prompt.toLowerCase().includes(term.toLowerCase())
    );

    if (hasClinicaLTerms) {
      return prompt; // Already enhanced
    }

    // Add clinical context to the prompt
    return `Professional physiotherapy demonstration: ${prompt}. Clinical setting with proper lighting, showing realistic human movement patterns for medical assessment.`;
  }

  /**
   * Generate movement video for specific body part and condition
   */
  async generateMovementVideo(
    bodyPart: string,
    condition: string,
    movementType: string,
    patientProfile?: any
  ): Promise<RunwayVideoResponse> {
    const age = patientProfile?.age || 'adult';
    const gender = patientProfile?.gender || 'person';
    
    const prompt = `${age} ${gender} demonstrating ${movementType} movement of ${bodyPart} showing ${condition} limitations. Professional physiotherapy assessment in clinical setting with clear view of movement restrictions and compensatory patterns.`;

    return this.generateClinicalVideo(prompt, {
      duration: 8, // Longer for movement analysis
      watermark: false // Professional use
    });
  }

  /**
   * Generate functional movement video
   */
  async generateFunctionalMovement(
    movementName: string,
    restrictions: string[],
    patientProfile?: any
  ): Promise<RunwayVideoResponse> {
    const age = patientProfile?.age || 'adult';
    const gender = patientProfile?.gender || 'person';
    const restrictionText = restrictions.length > 0 ? 
      `with ${restrictions.join(' and ')} limitations` : 
      'with normal movement patterns';

    const prompt = `${age} ${gender} performing ${movementName} ${restrictionText}. Professional physiotherapy movement analysis showing functional movement patterns and any compensatory strategies in clinical environment.`;

    return this.generateClinicalVideo(prompt, {
      duration: 10, // Longer for functional assessment
      watermark: false
    });
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<{ configured: boolean; apiKey: boolean; operational: boolean }> {
    const configured = this.isConfigured();
    
    if (!configured) {
      return {
        configured: false,
        apiKey: false,
        operational: false
      };
    }

    try {
      // Test API connectivity with a simple request
      const response = await fetch(`${this.baseUrl}/tasks/test-connection`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return {
        configured: true,
        apiKey: true,
        operational: response.status < 500 // Any non-server error is considered operational
      };

    } catch (error) {
      return {
        configured: true,
        apiKey: true,
        operational: false
      };
    }
  }
}

export const runwayService = new RunwayService();