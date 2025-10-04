/**
 * NIH Open-i Images API Routes
 */

import { Router } from 'express';
import { nihOpenIService } from '../nihOpenIService';

const router = Router();

// Search for medical images
router.get('/api/nih-images/search', async (req, res) => {
  try {
    const { query, bodyPart, modality, maxResults } = req.query;
    
    if (!query && !bodyPart) {
      return res.status(400).json({ 
        error: 'Query or bodyPart parameter is required' 
      });
    }
    
    const searchQuery = (query as string) || (bodyPart as string);
    const results = await nihOpenIService.searchImages(searchQuery, {
      bodyPart: bodyPart as string,
      modality: modality as string,
      maxResults: parseInt((maxResults as string) || '10')
    });
    
    res.json(results);
  } catch (error) {
    console.error('NIH image search error:', error);
    res.status(500).json({ 
      error: 'Failed to search medical images',
      images: [] 
    });
  }
});

// Get anatomy-specific images
router.get('/api/nih-images/anatomy/:bodyPart', async (req, res) => {
  try {
    const { bodyPart } = req.params;
    const { structure, viewType, includeLabeled } = req.query;
    
    const images = await nihOpenIService.getAnatomyImages(
      bodyPart,
      structure as string,
      {
        viewType: viewType as any,
        includeLabeled: includeLabeled === 'true'
      }
    );
    
    res.json({ images });
  } catch (error) {
    console.error('NIH anatomy images error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch anatomy images',
      images: [] 
    });
  }
});

// Get clinical case images
router.get('/api/nih-images/clinical', async (req, res) => {
  try {
    const { condition, bodyPart, modality } = req.query;
    
    if (!condition) {
      return res.status(400).json({ 
        error: 'Condition parameter is required' 
      });
    }
    
    const images = await nihOpenIService.getClinicalImages(
      condition as string,
      bodyPart as string,
      modality as any
    );
    
    res.json({ images });
  } catch (error) {
    console.error('NIH clinical images error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch clinical images',
      images: [] 
    });
  }
});

export default router;