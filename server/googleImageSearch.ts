import axios from 'axios';

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

export interface ExerciseImage {
  url: string;
  thumbnailUrl: string;
  title: string;
  contextLink?: string;
  width?: number;
  height?: number;
}

export interface ImageSearchResult {
  images: ExerciseImage[];
  searchTerm: string;
  timestamp: Date;
}

export async function searchExerciseImages(
  exerciseName: string,
  maxResults: number = 3
): Promise<ImageSearchResult> {
  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    throw new Error('Google Search API credentials not configured');
  }

  // Enhance search query for better exercise image results
  const searchQuery = `${exerciseName} physiotherapy exercise demonstration`;

  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_SEARCH_API_KEY,
        cx: GOOGLE_SEARCH_ENGINE_ID,
        q: searchQuery,
        searchType: 'image',
        num: maxResults,
        safe: 'active',
        imgType: 'photo',
        imgSize: 'medium',
      },
    });

    const images: ExerciseImage[] = (response.data.items || []).map((item: any) => ({
      url: item.link,
      thumbnailUrl: item.image?.thumbnailLink || item.link,
      title: item.title,
      contextLink: item.image?.contextLink,
      width: item.image?.width,
      height: item.image?.height,
    }));

    return {
      images,
      searchTerm: exerciseName,
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error('Google Image Search error:', error.response?.data || error.message);
    throw new Error('Failed to search for exercise images');
  }
}

export async function searchMultipleExercises(
  exerciseNames: string[],
  imagesPerExercise: number = 2
): Promise<Record<string, ExerciseImage[]>> {
  const results: Record<string, ExerciseImage[]> = {};

  // Search for each exercise in parallel
  await Promise.all(
    exerciseNames.map(async (exerciseName) => {
      try {
        const searchResult = await searchExerciseImages(exerciseName, imagesPerExercise);
        results[exerciseName] = searchResult.images;
      } catch (error) {
        console.error(`Failed to search images for ${exerciseName}:`, error);
        results[exerciseName] = [];
      }
    })
  );

  return results;
}
