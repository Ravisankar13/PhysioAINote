import { VertexAI } from '@google-cloud/vertexai';
import { GoogleAuth } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Google Veo Video Generation Service
 * Generates realistic medical movement videos from clinical text descriptions
 */
export class GoogleVeoService {
  private vertexAI: VertexAI;
  private model: any;

  constructor() {
    // Handle Google Cloud authentication
    this.setupAuthentication();
    
    // Initialize Vertex AI with project configuration
    this.vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT_ID,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    });
    
    // Initialize Veo model
    this.model = this.vertexAI.getGenerativeModel({
      model: 'veo-001'
    });
  }

  private setupAuthentication() {
    try {
      // If GOOGLE_APPLICATION_CREDENTIALS contains JSON content, write it to a temp file
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('{')) {
        const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
        fs.writeFileSync(credentialsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
        console.log('Google Cloud credentials file created successfully');
      }
    } catch (error) {
      console.error('Error setting up Google Cloud authentication:', error);
    }
  }

  /**
   * Generate video from clinical text description
   */
  async generateClinicalVideo(
    clinicalDescription: string,
    movementType: string = 'functional_movement',
    duration: number = 5
  ): Promise<{ videoUrl: string; generationId: string }> {
    try {
      console.log(`Generating video for: ${clinicalDescription}`);

      // Create enhanced prompt for medical movement videos
      const enhancedPrompt = this.createMedicalMovementPrompt(
        clinicalDescription, 
        movementType, 
        duration
      );

      // Generate video using Veo
      const response = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: enhancedPrompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_MEDICAL',
            threshold: 'BLOCK_NONE'
          }
        ]
      });

      // Process response to get video URL
      const videoData = this.processVeoResponse(response);
      
      console.log(`Video generated successfully: ${videoData.generationId}`);
      return videoData;

    } catch (error) {
      console.error('Error generating video with Google Veo:', error);
      
      // Provide user-friendly error messages
      if (error.message?.includes('GoogleAuthError') || error.message?.includes('authentication')) {
        throw new Error('Google Cloud authentication required. Please configure API credentials.');
      }
      
      if (error.message?.includes('ECONNREFUSED')) {
        throw new Error('Google Cloud service unavailable. Please check network connection.');
      }
      
      if (error.message?.includes('project')) {
        throw new Error('Google Cloud project not configured. Please set GOOGLE_CLOUD_PROJECT_ID.');
      }
      
      throw new Error(`Video generation failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Create specialized prompt for medical movement videos
   */
  private createMedicalMovementPrompt(
    clinicalDescription: string,
    movementType: string,
    duration: number
  ): string {
    const basePrompt = `Create a realistic ${duration}-second medical demonstration video showing:

CLINICAL SCENARIO: ${clinicalDescription}

REQUIREMENTS:
- Show a human figure/skeleton performing ${movementType}
- Demonstrate the specific movement limitations described
- Include visible compensatory movement patterns
- Medical/clinical setting with professional lighting
- Side view or anterior view for optimal assessment
- Smooth, realistic biomechanical movement
- Clear demonstration of the described impairment

VISUAL STYLE:
- Clean, clinical environment
- Professional medical demonstration
- Anatomically accurate movement patterns
- Clear visibility of movement restrictions
- Educational/instructional quality

MOVEMENT FOCUS:
- Start with neutral position
- Attempt the described movement
- Show limitation/restriction clearly
- Display compensatory strategies
- Return to neutral position

Generate a high-quality, medically accurate movement demonstration video.`;

    return basePrompt;
  }

  /**
   * Process Veo API response to extract video data
   */
  private processVeoResponse(response: any): { videoUrl: string; generationId: string } {
    try {
      // Extract video URL from Veo response
      const candidates = response.response?.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error('No video generated in response');
      }

      const videoContent = candidates[0]?.content?.parts?.find(
        (part: any) => part.video_url || part.videoUrl
      );

      if (!videoContent) {
        throw new Error('No video URL found in response');
      }

      return {
        videoUrl: videoContent.video_url || videoContent.videoUrl,
        generationId: response.response?.generationId || Date.now().toString()
      };

    } catch (error) {
      console.error('Error processing Veo response:', error);
      throw new Error('Failed to process video generation response');
    }
  }

  /**
   * Generate movement video for specific virtual patient
   */
  async generatePatientMovementVideo(
    patientData: any,
    movementType: string
  ): Promise<{ videoUrl: string; generationId: string }> {
    try {
      // Extract clinical information from patient data
      const clinicalText = this.extractClinicalContext(patientData);
      
      // Generate movement-specific description
      const movementDescription = this.createMovementDescription(
        clinicalText,
        movementType,
        patientData
      );

      return await this.generateClinicalVideo(movementDescription, movementType);

    } catch (error) {
      console.error('Error generating patient movement video:', error);
      throw error;
    }
  }

  /**
   * Extract clinical context from patient data
   */
  private extractClinicalContext(patientData: any): string {
    const contexts = [];
    
    if (patientData.clinicalPresentation?.chiefComplaint) {
      contexts.push(patientData.clinicalPresentation.chiefComplaint);
    }
    
    if (patientData.physicalFindings?.rangeOfMotion) {
      contexts.push(`Range of motion: ${patientData.physicalFindings.rangeOfMotion}`);
    }
    
    if (patientData.physicalFindings?.strength) {
      contexts.push(`Strength: ${patientData.physicalFindings.strength}`);
    }
    
    if (patientData.physicalFindings?.functionalMovement) {
      contexts.push(`Functional movement: ${patientData.physicalFindings.functionalMovement}`);
    }

    return contexts.join('. ') || 'General movement assessment';
  }

  /**
   * Create movement-specific description for video generation
   */
  private createMovementDescription(
    clinicalText: string,
    movementType: string,
    patientData: any
  ): string {
    const age = patientData.patientProfile?.age || 'adult';
    const gender = patientData.patientProfile?.gender || 'person';
    const bodyPart = patientData.bodyPart || 'general';

    return `${age}-year-old ${gender} with ${bodyPart} condition: ${clinicalText}. 
            Performing ${movementType.replace('_', ' ')} movement assessment. 
            Show realistic movement limitations and compensatory patterns based on the clinical presentation.`;
  }

  /**
   * Check if Google Cloud credentials are properly configured
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
        console.error('GOOGLE_CLOUD_PROJECT_ID environment variable not set');
        return false;
      }

      // Test API access
      await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: 'Test connection' }]
        }]
      });

      return true;
    } catch (error) {
      console.error('Google Veo configuration validation failed:', error);
      return false;
    }
  }
}

export const googleVeoService = new GoogleVeoService();