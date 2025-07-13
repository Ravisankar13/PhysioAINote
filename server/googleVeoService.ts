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
  private configured: boolean = false;

  constructor() {
    // Handle Google Cloud authentication
    this.setupAuthentication();
    
    // Only initialize if we have valid credentials
    if (this.isConfigured()) {
      console.log('Initializing Vertex AI with project:', process.env.GOOGLE_CLOUD_PROJECT_ID);
      
      try {
        // Initialize Vertex AI with project configuration
        this.vertexAI = new VertexAI({
          project: process.env.GOOGLE_CLOUD_PROJECT_ID,
          location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
        });
        
        // Initialize Veo model
        this.model = this.vertexAI.getGenerativeModel({
          model: 'veo-001'
        });
        
        this.configured = true;
        console.log('Google Veo service successfully initialized');
      } catch (error) {
        console.error('Failed to initialize Google Veo service:', error);
        this.configured = false;
      }
    } else {
      console.log('Google Veo not configured - video generation will be unavailable');
    }
  }

  private isConfigured(): boolean {
    const hasProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_PROJECT_ID.length < 100;
    const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const isValid = hasProjectId && hasCredentials && this.configured !== false;
    
    console.log('Configuration check:', {
      hasProjectId: !!hasProjectId,
      projectIdLength: process.env.GOOGLE_CLOUD_PROJECT_ID?.length,
      hasCredentials: !!hasCredentials,
      configured: this.configured,
      isValid
    });
    
    return isValid;
  }

  private setupAuthentication() {
    try {
      console.log('Setting up Google Cloud authentication...');
      console.log('GOOGLE_CLOUD_PROJECT_ID length:', process.env.GOOGLE_CLOUD_PROJECT_ID?.length);
      console.log('GOOGLE_APPLICATION_CREDENTIALS value:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      
      // Check if GOOGLE_CLOUD_PROJECT_ID contains the actual JSON credentials (common misconfig)
      if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_PROJECT_ID.length > 100) {
        console.log('GOOGLE_CLOUD_PROJECT_ID appears to contain credential data - attempting to parse...');
        
        const dataStr = process.env.GOOGLE_CLOUD_PROJECT_ID;
        
        // Try to parse as JSON directly first
        try {
          const credentials = JSON.parse(dataStr);
          if (credentials.type && credentials.project_id && credentials.private_key && credentials.client_email) {
            console.log('Found valid JSON credentials in GOOGLE_CLOUD_PROJECT_ID');
            console.log('Project ID from credentials:', credentials.project_id);
            
            // Create proper credentials file
            const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
            fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
            
            // Set proper environment variables
            process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
            process.env.GOOGLE_CLOUD_PROJECT_ID = credentials.project_id;
            
            console.log('Created credentials file at:', credentialsPath);
            console.log('Set project ID to:', credentials.project_id);
            
            this.configured = true;
            return;
          }
        } catch (parseError) {
          console.log('Direct JSON parse failed, checking if this looks like a private key...');
          
          // Check if this looks like a private key (starts with MII)
          if (dataStr.startsWith('MII') || dataStr.includes('-----BEGIN PRIVATE KEY-----')) {
            console.log('Data appears to be a private key fragment - credentials are incomplete');
            console.log('NOTICE: Only partial Google Cloud credentials detected. Full service account JSON required.');
            this.configured = false;
            return;
          }
          console.log('Data in GOOGLE_CLOUD_PROJECT_ID is not valid JSON, trying pattern extraction...');
          
          // Look for JSON patterns in the data
          const jsonMatch = dataStr.match(/\{[^}]+\}/);
          if (jsonMatch) {
            try {
              const credentials = JSON.parse(jsonMatch[0]);
              if (credentials.project_id) {
                console.log('Extracted project ID from embedded JSON:', credentials.project_id);
                process.env.GOOGLE_CLOUD_PROJECT_ID = credentials.project_id;
                this.configured = true;
                return;
              }
            } catch (innerParseError) {
              console.log('Failed to parse embedded JSON');
            }
          }
          
          // Look for potential project ID patterns  
          const projectMatch = dataStr.match(/([a-z][a-z0-9\-]{4,28}[a-z0-9])/);
          if (projectMatch) {
            console.log('Found potential project ID:', projectMatch[1]);
            process.env.GOOGLE_CLOUD_PROJECT_ID = projectMatch[1];
            this.configured = true;
            return;
          }
        }
      }
      
      // Check if GOOGLE_APPLICATION_CREDENTIALS contains JSON content
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('{')) {
        const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
        
        console.log('Parsing Google Cloud credentials JSON from GOOGLE_APPLICATION_CREDENTIALS...');
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        
        // Validate required credential fields
        if (!credentials.type || !credentials.project_id || !credentials.private_key || !credentials.client_email) {
          console.error('Missing required credential fields. Available keys:', Object.keys(credentials));
          throw new Error('Invalid Google Cloud credentials format');
        }
        
        console.log('Credentials validated successfully');
        console.log('Project ID from credentials:', credentials.project_id);
        
        // Write formatted JSON to file
        fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
        
        // Update environment variable to point to file
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
        
        // Set the actual project ID from credentials
        process.env.GOOGLE_CLOUD_PROJECT_ID = credentials.project_id;
        
        console.log('Google Cloud credentials file created successfully at:', credentialsPath);
        console.log('Project ID set to:', credentials.project_id);
        
        this.configured = true;
        return;
      }
      
      // Check if we have valid separate project ID and credentials file
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && 
          process.env.GOOGLE_CLOUD_PROJECT_ID && 
          process.env.GOOGLE_CLOUD_PROJECT_ID.length < 100) {
        console.log('Using existing file-based Google Cloud credentials');
        this.configured = true;
        return;
      }
      
      console.log('No valid Google Cloud credentials configuration found');
      console.error('Current GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      console.error('Current GOOGLE_CLOUD_PROJECT_ID length:', process.env.GOOGLE_CLOUD_PROJECT_ID?.length);
      this.configured = false;
      
    } catch (error) {
      console.error('Error setting up Google Cloud authentication:', error);
      this.configured = false;
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
    // Check if service is properly configured
    if (!this.isConfigured()) {
      throw new Error('Google Veo service is not properly configured. Video generation requires valid Google Cloud credentials and project ID.');
    }
    
    if (!this.model) {
      throw new Error('Google Veo model not initialized. Please check Google Cloud configuration.');
    }

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
      
      // Provide user-friendly error messages based on error type
      if (error.message?.includes('GoogleAuthError') || 
          error.message?.includes('authentication') ||
          error.message?.includes('ENOENT') ||
          error.code === 'ENOENT') {
        throw new Error('Google Cloud authentication failed. Complete service account JSON credentials required for video generation.');
      }
      
      if (error.message?.includes('ECONNREFUSED')) {
        throw new Error('Google Cloud service unavailable. Please check network connection.');
      }
      
      if (error.message?.includes('project')) {
        throw new Error('Google Cloud project not configured. Please set GOOGLE_CLOUD_PROJECT_ID.');
      }
      
      if (error.message?.includes('lstat') || error.message?.includes('spatial-conduit')) {
        throw new Error('Invalid Google Cloud credentials path. Please provide complete service account JSON credentials.');
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