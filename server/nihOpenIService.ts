/**
 * NIH Open-i Medical Image Fetching Service
 * 
 * This service fetches medical images and clinical content from the NIH Open-i API
 * which provides access to over 1.6 million images from PubMed Central
 */

import axios from 'axios';

export interface OpenIImage {
  imageUrl: string;
  thumbnail?: string;
  title: string;
  description?: string;
  pmid?: string;
  imageType?: 'xray' | 'mri' | 'ct' | 'ultrasound' | 'clinical_photo' | 'diagram';
  attribution?: string;
  abstract?: string;
  keywords?: string[];
}

export interface OpenISearchResponse {
  total: number;
  images: OpenIImage[];
  nextPage?: string;
}

export class NIHOpenIService {
  private baseUrl = 'https://openi.nlm.nih.gov/api';
  
  /**
   * Search for medical images based on query
   */
  async searchImages(
    query: string, 
    options?: {
      maxResults?: number;
      imageType?: string;
      bodyPart?: string;
      modality?: string;
    }
  ): Promise<OpenISearchResponse> {
    try {
      // Build enhanced query with medical context
      let enhancedQuery = query;
      if (options?.bodyPart) {
        enhancedQuery += ` ${options.bodyPart}`;
      }
      if (options?.modality) {
        enhancedQuery += ` ${options.modality}`;
      }
      
      // Make API request
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          query: enhancedQuery,
          m: options?.maxResults || 10, // max results
          it: 'xg', // image type: x-ray/graphics
          fields: 'imgLarge,imgThumb,title,abstract,pmid,keywords',
          output: 'json'
        }
      });
      
      // Parse and format response
      const data = response.data;
      const images: OpenIImage[] = [];
      
      if (data.list && Array.isArray(data.list)) {
        for (const item of data.list) {
          if (item.imgLarge || item.image) {
            images.push({
              imageUrl: this.formatImageUrl(item.imgLarge || item.image?.large || item.image?.url),
              thumbnail: this.formatImageUrl(item.imgThumb || item.image?.thumb),
              title: item.title || 'Medical Image',
              description: item.abstract?.substring(0, 200),
              pmid: item.pmid,
              imageType: this.detectImageType(item),
              attribution: `NIH/NLM via Open-i ${item.pmid ? `(PMID: ${item.pmid})` : ''}`,
              abstract: item.abstract,
              keywords: item.keywords?.split(',').map((k: string) => k.trim())
            });
          }
        }
      }
      
      return {
        total: data.total || images.length,
        images
      };
      
    } catch (error) {
      console.error('NIH Open-i API error:', error);
      // Return empty results on error
      return {
        total: 0,
        images: []
      };
    }
  }
  
  /**
   * Get images for specific anatomical structures
   */
  async getAnatomyImages(
    bodyPart: string,
    structure?: string,
    options?: {
      viewType?: 'anterior' | 'posterior' | 'lateral' | 'medial' | 'superior' | 'inferior';
      includeLabeled?: boolean;
    }
  ): Promise<OpenIImage[]> {
    // Build anatomy-specific query
    let query = `${bodyPart} anatomy`;
    
    if (structure) {
      query += ` ${structure}`;
    }
    
    if (options?.viewType) {
      query += ` ${options.viewType} view`;
    }
    
    if (options?.includeLabeled) {
      query += ' labeled diagram anatomical';
    }
    
    const results = await this.searchImages(query, {
      maxResults: 20,
      bodyPart
    });
    
    return results.images;
  }
  
  /**
   * Get clinical case images for specific conditions
   */
  async getClinicalImages(
    condition: string,
    bodyPart?: string,
    modalityType?: 'xray' | 'mri' | 'ct' | 'ultrasound'
  ): Promise<OpenIImage[]> {
    let query = condition;
    
    if (modalityType) {
      const modalityMap = {
        'xray': 'radiograph x-ray',
        'mri': 'MRI magnetic resonance',
        'ct': 'CT computed tomography',
        'ultrasound': 'ultrasound sonography'
      };
      query += ` ${modalityMap[modalityType]}`;
    }
    
    const results = await this.searchImages(query, {
      maxResults: 15,
      bodyPart,
      modality: modalityType
    });
    
    return results.images;
  }
  
  /**
   * Format image URLs to ensure they work correctly
   */
  private formatImageUrl(url?: string): string | undefined {
    if (!url) return undefined;
    
    // If it's a relative URL, prepend the base URL
    if (url.startsWith('/')) {
      return `https://openi.nlm.nih.gov${url}`;
    }
    
    // Handle PubMed Central URLs
    if (url.includes('pmc') && !url.startsWith('http')) {
      return `https://www.ncbi.nlm.nih.gov/pmc/articles/${url}`;
    }
    
    return url;
  }
  
  /**
   * Detect image type from metadata
   */
  private detectImageType(item: any): OpenIImage['imageType'] {
    const text = (item.title + ' ' + item.abstract + ' ' + (item.keywords || '')).toLowerCase();
    
    if (text.includes('x-ray') || text.includes('radiograph')) {
      return 'xray';
    } else if (text.includes('mri') || text.includes('magnetic resonance')) {
      return 'mri';
    } else if (text.includes('ct') || text.includes('computed tomography')) {
      return 'ct';
    } else if (text.includes('ultrasound') || text.includes('sonograph')) {
      return 'ultrasound';
    } else if (text.includes('clinical') || text.includes('photograph')) {
      return 'clinical_photo';
    }
    
    return 'diagram';
  }
  
  /**
   * Cache images locally to reduce API calls
   */
  private imageCache = new Map<string, OpenIImage[]>();
  
  async getCachedImages(query: string): Promise<OpenIImage[]> {
    const cacheKey = query.toLowerCase().trim();
    
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }
    
    const results = await this.searchImages(query);
    this.imageCache.set(cacheKey, results.images);
    
    // Clear cache if it gets too large
    if (this.imageCache.size > 100) {
      const firstKey = this.imageCache.keys().next().value;
      this.imageCache.delete(firstKey);
    }
    
    return results.images;
  }
}

// Export singleton instance
export const nihOpenIService = new NIHOpenIService();