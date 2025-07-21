import { OpenAI } from "openai";
import ytdl from "ytdl-core";
import ffmpeg from "ffmpeg-static";
import { spawn } from "child_process";
import { createWriteStream, createReadStream, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { nanoid } from "nanoid";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface YouTubeVideoInfo {
  title: string;
  description: string;
  duration: number;
  channelName: string;
  publishDate: string;
  videoId: string;
}

interface VideoAnalysisResult {
  id: string;
  videoInfo: YouTubeVideoInfo;
  transcript: string;
  clinicalAnalysis: {
    conditionIdentified: string;
    bodyPartsInvolved: string[];
    treatmentTechniques: string[];
    assessmentMethods: string[];
    clinicalReasoning: string;
    safetyConsiderations: string[];
  };
  relatedResearch: Array<{
    title: string;
    relevanceScore: number;
    keyPoints: string[];
    bodyPart: string;
  }>;
  treatmentRecommendations: {
    evidenceBasedAlternatives: string[];
    bestPractices: string[];
    contraindications: string[];
  };
  educationalValue: {
    learningPoints: string[];
    skillsDemonstrated: string[];
    clinicalReasoningInsights: string[];
  };
  timestamp: string;
}

export class YouTubeAnalysisService {
  /**
   * Extract video ID from YouTube URL
   */
  private extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Get video information and validate access
   */
  async getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL provided");
    }

    try {
      const info = await ytdl.getInfo(videoId);
      const videoDetails = info.videoDetails;

      return {
        title: videoDetails.title,
        description: videoDetails.description || "",
        duration: parseInt(videoDetails.lengthSeconds),
        channelName: videoDetails.author.name,
        publishDate: videoDetails.publishDate,
        videoId: videoId,
      };
    } catch (error: any) {
      console.error("Error fetching video info:", error);
      throw new Error(`Could not access video: ${error.message}`);
    }
  }

  /**
   * Extract audio from YouTube video
   */
  private async extractAudio(videoId: string): Promise<string> {
    const tempDir = "/tmp";
    const audioPath = join(tempDir, `${videoId}_audio.wav`);

    return new Promise((resolve, reject) => {
      try {
        // Get audio stream from YouTube
        const audioStream = ytdl(videoId, {
          quality: 'highestaudio',
          filter: 'audioonly',
        });

        // Convert to WAV using ffmpeg
        const ffmpegProcess = spawn(ffmpeg!, [
          '-i', 'pipe:0',
          '-vn', // No video
          '-acodec', 'pcm_s16le',
          '-ar', '16000', // 16kHz sample rate
          '-ac', '1', // Mono
          '-f', 'wav',
          audioPath
        ]);

        audioStream.pipe(ffmpegProcess.stdin);

        ffmpegProcess.stderr.on('data', (data) => {
          console.log(`FFmpeg stderr: ${data}`);
        });

        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            resolve(audioPath);
          } else {
            reject(new Error(`FFmpeg process failed with code ${code}`));
          }
        });

        ffmpegProcess.on('error', (error) => {
          reject(new Error(`FFmpeg error: ${error.message}`));
        });

      } catch (error: any) {
        reject(new Error(`Audio extraction failed: ${error.message}`));
      }
    });
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  private async transcribeAudio(audioPath: string): Promise<string> {
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(audioPath),
        model: "whisper-1",
        language: "en",
      });

      return transcription.text;
    } catch (error: any) {
      console.error("Error transcribing audio:", error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Analyze video content with AI
   */
  private async analyzeVideoContent(
    videoInfo: YouTubeVideoInfo,
    transcript: string
  ): Promise<VideoAnalysisResult['clinicalAnalysis']> {
    try {
      const prompt = `
Analyze this physiotherapy/manual therapy clinical video based on the transcript and video information.

**Video Details:**
- Title: ${videoInfo.title}
- Channel: ${videoInfo.channelName}
- Description: ${videoInfo.description.substring(0, 500)}...

**Transcript:**
${transcript}

Please provide a comprehensive clinical analysis in JSON format:

{
  "conditionIdentified": "Primary condition or diagnosis being treated",
  "bodyPartsInvolved": ["array", "of", "body", "parts"],
  "treatmentTechniques": ["specific", "techniques", "demonstrated"],
  "assessmentMethods": ["clinical", "tests", "used"],
  "clinicalReasoning": "Analysis of the practitioner's decision-making process",
  "safetyConsiderations": ["safety", "considerations", "or", "contraindications"]
}

Focus on identifying specific manual therapy techniques, assessment methods, and clinical reasoning demonstrated in the video.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert physiotherapist and manual therapist who analyzes clinical videos to extract educational value and identify best practices."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No analysis content received");
      }

      return JSON.parse(content);
    } catch (error: any) {
      console.error("Error analyzing video content:", error);
      throw new Error(`Video analysis failed: ${error.message}`);
    }
  }

  /**
   * Find related research articles
   */
  private async findRelatedResearch(
    clinicalAnalysis: VideoAnalysisResult['clinicalAnalysis']
  ): Promise<VideoAnalysisResult['relatedResearch']> {
    try {
      // Simulate research correlation based on body parts and techniques
      // In a real implementation, this would query your research database
      const mockResearch = [
        {
          title: `Manual Therapy Techniques for ${clinicalAnalysis.conditionIdentified}`,
          relevanceScore: 95,
          keyPoints: [
            "Evidence supports manual therapy for this condition",
            "Specific technique effectiveness demonstrated",
            "Safety profile well-established"
          ],
          bodyPart: clinicalAnalysis.bodyPartsInvolved[0] || "general"
        },
        {
          title: `Assessment Methods in ${clinicalAnalysis.bodyPartsInvolved[0]} Disorders`,
          relevanceScore: 88,
          keyPoints: [
            "Validated assessment tools available",
            "Diagnostic accuracy studies support methods",
            "Clinical utility demonstrated"
          ],
          bodyPart: clinicalAnalysis.bodyPartsInvolved[0] || "general"
        }
      ];

      return mockResearch;
    } catch (error: any) {
      console.error("Error finding related research:", error);
      return [];
    }
  }

  /**
   * Generate treatment recommendations
   */
  private async generateTreatmentRecommendations(
    clinicalAnalysis: VideoAnalysisResult['clinicalAnalysis']
  ): Promise<VideoAnalysisResult['treatmentRecommendations']> {
    try {
      const prompt = `
Based on this clinical analysis, provide evidence-based treatment recommendations:

**Condition:** ${clinicalAnalysis.conditionIdentified}
**Body Parts:** ${clinicalAnalysis.bodyPartsInvolved.join(", ")}
**Techniques Used:** ${clinicalAnalysis.treatmentTechniques.join(", ")}

Provide recommendations in JSON format:
{
  "evidenceBasedAlternatives": ["alternative treatment approaches with strong evidence"],
  "bestPractices": ["current best practice guidelines for this condition"],
  "contraindications": ["important contraindications or precautions"]
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an evidence-based practice expert in physiotherapy who provides research-backed treatment recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No recommendations received");
      }

      return JSON.parse(content);
    } catch (error: any) {
      console.error("Error generating recommendations:", error);
      return {
        evidenceBasedAlternatives: ["Standard care protocols available"],
        bestPractices: ["Follow current clinical guidelines"],
        contraindications: ["Assess patient individually for contraindications"]
      };
    }
  }

  /**
   * Generate educational insights
   */
  private async generateEducationalValue(
    clinicalAnalysis: VideoAnalysisResult['clinicalAnalysis'],
    transcript: string
  ): Promise<VideoAnalysisResult['educationalValue']> {
    try {
      const prompt = `
Analyze the educational value of this clinical video for physiotherapy students and practitioners:

**Clinical Analysis:** ${JSON.stringify(clinicalAnalysis)}
**Transcript:** ${transcript.substring(0, 1000)}...

Provide educational insights in JSON format:
{
  "learningPoints": ["key educational takeaways from the video"],
  "skillsDemonstrated": ["specific clinical skills shown"],
  "clinicalReasoningInsights": ["insights into clinical decision-making process"]
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a physiotherapy educator who identifies learning opportunities and educational value in clinical demonstrations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No educational insights received");
      }

      return JSON.parse(content);
    } catch (error: any) {
      console.error("Error generating educational insights:", error);
      return {
        learningPoints: ["Clinical demonstration provides practical learning value"],
        skillsDemonstrated: ["Various manual therapy and assessment techniques"],
        clinicalReasoningInsights: ["Clinical decision-making process demonstrated"]
      };
    }
  }

  /**
   * Main method to analyze YouTube video
   */
  async analyzeYouTubeVideo(url: string): Promise<VideoAnalysisResult> {
    const analysisId = nanoid();
    
    try {
      console.log("Starting YouTube video analysis...");
      
      // Step 1: Get video information
      console.log("Fetching video information...");
      const videoInfo = await this.getVideoInfo(url);
      
      // Step 2: Extract audio
      console.log("Extracting audio from video...");
      const audioPath = await this.extractAudio(videoInfo.videoId);
      
      try {
        // Step 3: Transcribe audio
        console.log("Transcribing audio...");
        const transcript = await this.transcribeAudio(audioPath);
        
        // Step 4: Analyze content
        console.log("Analyzing video content...");
        const clinicalAnalysis = await this.analyzeVideoContent(videoInfo, transcript);
        
        // Step 5: Find related research
        console.log("Finding related research...");
        const relatedResearch = await this.findRelatedResearch(clinicalAnalysis);
        
        // Step 6: Generate treatment recommendations
        console.log("Generating treatment recommendations...");
        const treatmentRecommendations = await this.generateTreatmentRecommendations(clinicalAnalysis);
        
        // Step 7: Generate educational insights
        console.log("Generating educational insights...");
        const educationalValue = await this.generateEducationalValue(clinicalAnalysis, transcript);
        
        const result: VideoAnalysisResult = {
          id: analysisId,
          videoInfo,
          transcript,
          clinicalAnalysis,
          relatedResearch,
          treatmentRecommendations,
          educationalValue,
          timestamp: new Date().toISOString(),
        };
        
        console.log("YouTube video analysis completed successfully!");
        return result;
        
      } finally {
        // Clean up temporary audio file
        if (existsSync(audioPath)) {
          unlinkSync(audioPath);
        }
      }
      
    } catch (error: any) {
      console.error("YouTube analysis error:", error);
      throw new Error(`Video analysis failed: ${error.message}`);
    }
  }

  /**
   * Validate YouTube URL
   */
  isValidYouTubeUrl(url: string): boolean {
    const videoId = this.extractVideoId(url);
    return videoId !== null;
  }
}

export const youtubeAnalysisService = new YouTubeAnalysisService();