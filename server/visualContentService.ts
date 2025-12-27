import OpenAI from "openai";
import { config } from 'dotenv';
config();

interface ImageGenerationResult {
  url: string;
  prompt: string;
  type: 'generated';
}

interface ExternalImageResult {
  url: string;
  description: string;
  source: string;
  photographer?: string;
  type: 'external';
}

interface VideoEmbedResult {
  videoId: string;
  title: string;
  thumbnail: string;
  embedUrl: string;
  type: 'video';
}

export type VisualContentResult = ImageGenerationResult | ExternalImageResult | VideoEmbedResult;

class VisualContentService {
  private openai: OpenAI;
  private unsplashApiKey: string | undefined;
  private pexelsApiKey: string | undefined;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY;
    this.pexelsApiKey = process.env.PEXELS_API_KEY;
  }

  // Generate AI images for exercises
  async generateExerciseImage(exerciseName: string, description: string): Promise<ImageGenerationResult | null> {
    try {
      const enhancedPrompt = `Professional physiotherapy exercise demonstration: ${exerciseName}. ${description}. Medical illustration style showing proper form and body position, clear anatomical view, clean white background, educational diagram quality.`;
      
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural"
      });

      if (response.data && response.data[0]?.url) {
        return {
          url: response.data[0].url,
          prompt: exerciseName,
          type: 'generated'
        };
      }
      return null;
    } catch (error) {
      console.error('Error generating image:', error);
      return null;
    }
  }

  // Search external image APIs for medical/exercise images
  async searchExternalImages(query: string, limit: number = 3): Promise<ExternalImageResult[]> {
    const results: ExternalImageResult[] = [];
    
    // Enhance query with physiotherapy-specific terms
    const enhancedQuery = this.enhancePhysiotherapyQuery(query);
    
    // Try Pexels API first (free, good for health/fitness images)
    if (this.pexelsApiKey) {
      try {
        const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(enhancedQuery)}&per_page=${limit}`;
        const response = await fetch(pexelsUrl, {
          headers: {
            'Authorization': this.pexelsApiKey
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          for (const photo of data.photos || []) {
            results.push({
              url: photo.src.large,
              description: photo.alt || query,
              source: 'Pexels',
              photographer: photo.photographer,
              type: 'external'
            });
          }
        }
      } catch (error) {
        console.error('Pexels API error:', error);
      }
    }
    
    // Try Unsplash API as fallback
    if (this.unsplashApiKey && results.length < limit) {
      try {
        const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(enhancedQuery)}&per_page=${limit - results.length}`;
        const response = await fetch(unsplashUrl, {
          headers: {
            'Authorization': `Client-ID ${this.unsplashApiKey}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          for (const photo of data.results || []) {
            results.push({
              url: photo.urls.regular,
              description: photo.alt_description || photo.description || query,
              source: 'Unsplash',
              photographer: photo.user.name,
              type: 'external'
            });
          }
        }
      } catch (error) {
        console.error('Unsplash API error:', error);
      }
    }
    
    return results;
  }

  // Helper function to enhance queries with physiotherapy-specific terms
  private enhancePhysiotherapyQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Add relevant terms based on context
    if (lowerQuery.includes('exercise') || lowerQuery.includes('stretch')) {
      return `${query} physiotherapy rehabilitation therapy`;
    } else if (lowerQuery.includes('shoulder') || lowerQuery.includes('arm')) {
      return `${query} exercise physiotherapy shoulder rehabilitation`;
    } else if (lowerQuery.includes('back') || lowerQuery.includes('spine')) {
      return `${query} back exercise physiotherapy rehabilitation`;
    } else if (lowerQuery.includes('knee') || lowerQuery.includes('leg')) {
      return `${query} knee exercise physiotherapy rehabilitation`;
    } else if (lowerQuery.includes('neck') || lowerQuery.includes('cervical')) {
      return `${query} neck exercise physiotherapy rehabilitation`;
    } else {
      return `${query} exercise physiotherapy rehabilitation therapy`;
    }
  }

  // Search YouTube for exercise demonstration videos
  async searchYouTubeVideos(query: string, limit: number = 2): Promise<VideoEmbedResult[]> {
    const results: VideoEmbedResult[] = [];
    
    // We'll use YouTube's oEmbed API (no API key required for basic embedding)
    // For now, we'll search using a predefined list of trusted physiotherapy channels
    const trustedChannels = [
      'physiotutors',
      'AskDoctorJo',
      'Bob & Brad',
      'Athlean-X',
      'Jeff Nippard'
    ];
    
    // Since YouTube API requires key, we'll use a workaround with predefined video IDs
    // In production, you'd want to use YouTube Data API v3
    const exerciseVideos: Record<string, string[]> = {
      'bridge': ['1bi0vDOt2jc', 'aYmOYnsJVGg'],
      'squat': ['xqvCmoLULNY', 'ultWZbUMPL8'],
      'deadlift': ['op9kVnvK3YY', 'ytGaGIn3SjE'],
      'plank': ['ASdvN_XEl_c', 'pvIjsG5Svck'],
      'clamshell': ['EG5_gXcfozw', 'YnVyiVQyRYs'],
      'lunge': ['QOVaHwm-Q6U', '7SMzPn4LGjQ']
    };
    
    // Simple keyword matching for demo purposes
    const searchKey = Object.keys(exerciseVideos).find(key => 
      query.toLowerCase().includes(key)
    );
    
    if (searchKey && exerciseVideos[searchKey]) {
      for (const videoId of exerciseVideos[searchKey].slice(0, limit)) {
        results.push({
          videoId: videoId,
          title: `${query} - Exercise Demonstration`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          type: 'video'
        });
      }
    }
    
    return results;
  }

  // Main function to get visual content based on request
  async getVisualContent(
    query: string, 
    options: {
      includeAI?: boolean;
      includeExternal?: boolean;
      includeVideos?: boolean;
      maxResults?: number;
    } = {}
  ): Promise<VisualContentResult[]> {
    const {
      includeAI = true,
      includeExternal = true,
      includeVideos = true,
      maxResults = 5
    } = options;
    
    const results: VisualContentResult[] = [];
    const promises: Promise<any>[] = [];
    
    // Detect if this is an exercise-related query
    const isExerciseQuery = /exercise|stretch|movement|position|technique/i.test(query);
    
    if (isExerciseQuery) {
      // For exercises, prioritize videos and external images (DALL-E disabled due to billing limits)
      if (includeVideos) {
        promises.push(
          this.searchYouTubeVideos(query, 2)
            .then(videos => results.push(...videos))
        );
      }
      
      if (includeExternal) {
        promises.push(
          this.searchExternalImages(query, 3)
            .then(images => results.push(...images))
        );
      }
    } else {
      // For non-exercise queries, use external images only (DALL-E disabled)
      if (includeExternal) {
        promises.push(
          this.searchExternalImages(query, 3)
            .then(images => results.push(...images))
        );
      }
    }
    
    await Promise.all(promises);
    
    return results.slice(0, maxResults);
  }

  // Function to detect image requests in chat messages
  detectImageRequest(message: string): boolean {
    const imageKeywords = [
      'show me', 'image', 'picture', 'photo', 'demonstrate',
      'what does', 'how to', 'can you show', 'visualize',
      'illustration', 'diagram', 'video', 'see how',
      'exercise for', 'exercises for', 'stretches for', 'strengthening for',
      'rehabilitation for', 'therapy for', 'treatment for', 'how do i',
      'what exercises', 'what stretches', 'rehab exercises', 'physio exercises'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    // Check for direct image requests
    const hasImageKeyword = imageKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Check for exercise-related queries (implicit image request)
    const exercisePatterns = [
      /exercise.*for.*\w+/i,
      /stretch.*for.*\w+/i,
      /strengthen.*\w+/i,
      /rehabilitation.*for/i,
      /how.*do.*exercise/i,
      /show.*exercise/i,
      /demonstrate.*movement/i
    ];
    
    const hasExercisePattern = exercisePatterns.some(pattern => pattern.test(message));
    
    return hasImageKeyword || hasExercisePattern;
  }

  // Function to extract exercise names from messages
  extractExerciseNames(message: string): string[] {
    const commonExercises = [
      // Basic exercises
      'bridge', 'squat', 'deadlift', 'plank', 'clamshell', 'lunge',
      'push-up', 'pull-up', 'row', 'press', 'curl', 'extension',
      'flexion', 'rotation', 'stretch', 'mobilization', 'strengthening',
      
      // Physiotherapy specific
      'pendulum', 'wall slides', 'scapular', 'rotator cuff', 'chin tucks',
      'heel raises', 'toe raises', 'ankle pumps', 'piriformis', 'hip thrust',
      'dead bug', 'bird dog', 'cat cow', 'knee to chest', 'hamstring',
      'quadriceps', 'calf raises', 'glute bridges', 'side lying',
      'prone lying', 'supine lying', 'standing', 'seated',
      
      // Movement patterns
      'abduction', 'adduction', 'internal rotation', 'external rotation',
      'dorsiflexion', 'plantarflexion', 'inversion', 'eversion',
      'forward bending', 'backward bending', 'side bending',
      
      // Body parts for context
      'shoulder', 'neck', 'back', 'hip', 'knee', 'ankle', 'foot',
      'elbow', 'wrist', 'hand', 'spine', 'core', 'pelvis'
    ];
    
    const found: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Look for exercise combinations (e.g., "shoulder external rotation")
    for (let i = 0; i < commonExercises.length; i++) {
      for (let j = i + 1; j < commonExercises.length; j++) {
        const combo = `${commonExercises[i]} ${commonExercises[j]}`;
        if (lowerMessage.includes(combo)) {
          found.push(combo);
        }
      }
    }
    
    // Look for individual exercises
    for (const exercise of commonExercises) {
      if (lowerMessage.includes(exercise)) {
        found.push(exercise);
      }
    }
    
    // Remove duplicates and prioritize longer matches
    return [...new Set(found)].sort((a, b) => b.length - a.length).slice(0, 5);
  }
}

export const visualContentService = new VisualContentService();