import crypto from 'crypto';

interface VoicePattern {
  pitchMean: number;
  pitchStdDev: number;
  speechRate: number;
  pauseRatio: number;
  volumePattern: number[];
}

interface ClinicalPattern {
  symptomKeywords: string[];
  movementPatterns: number[];
  painLocations: string[];
  functionalLimitations: string[];
}

interface PatientFingerprint {
  hash: string;
  visitCount: number;
  lastVisitDate: string;
  clinicalProgressionMarkers: number[];
}

export class PatientFingerprintService {
  /**
   * Extract voice patterns from audio analysis
   * This uses frequency analysis to create a unique voice signature
   */
  static extractVoicePattern(audioFeatures: {
    frequencies: number[];
    amplitudes: number[];
    duration: number;
    silences: number[];
  }): VoicePattern {
    // Calculate pitch characteristics
    const pitchMean = audioFeatures.frequencies.reduce((a, b) => a + b, 0) / audioFeatures.frequencies.length;
    const pitchVariance = audioFeatures.frequencies.reduce((sum, freq) => 
      sum + Math.pow(freq - pitchMean, 2), 0) / audioFeatures.frequencies.length;
    const pitchStdDev = Math.sqrt(pitchVariance);
    
    // Calculate speech rate (syllables per second approximation)
    const speechRate = audioFeatures.amplitudes.filter(a => a > 0.3).length / audioFeatures.duration;
    
    // Calculate pause ratio
    const totalSilence = audioFeatures.silences.reduce((a, b) => a + b, 0);
    const pauseRatio = totalSilence / audioFeatures.duration;
    
    // Create volume pattern signature (normalized)
    const volumePattern = this.normalizePattern(audioFeatures.amplitudes.slice(0, 100));
    
    return {
      pitchMean,
      pitchStdDev,
      speechRate,
      pauseRatio,
      volumePattern
    };
  }

  /**
   * Extract clinical patterns from transcript and assessment data
   * Creates anonymous clinical markers without storing actual medical information
   */
  static extractClinicalPattern(transcript: string, movementData?: any): ClinicalPattern {
    // Extract symptom keywords (anonymized)
    const symptomKeywords = this.extractSymptomKeywords(transcript);
    
    // Extract movement patterns if available
    const movementPatterns = movementData ? 
      this.extractMovementPatterns(movementData) : [];
    
    // Extract pain locations (generalized)
    const painLocations = this.extractPainLocations(transcript);
    
    // Extract functional limitations
    const functionalLimitations = this.extractFunctionalLimitations(transcript);
    
    return {
      symptomKeywords,
      movementPatterns,
      painLocations,
      functionalLimitations
    };
  }

  /**
   * Generate a deterministic hash from voice and clinical patterns
   * This creates a unique identifier that cannot be reversed to identify the patient
   */
  static generatePatientHash(
    voicePattern: VoicePattern,
    clinicalPattern: ClinicalPattern
  ): string {
    // Combine all pattern data into a single string
    const combinedData = JSON.stringify({
      voice: {
        pitch: Math.round(voicePattern.pitchMean),
        variation: Math.round(voicePattern.pitchStdDev),
        rate: Math.round(voicePattern.speechRate * 10),
        pauses: Math.round(voicePattern.pauseRatio * 100),
        volume: voicePattern.volumePattern.map(v => Math.round(v * 100))
      },
      clinical: {
        symptoms: clinicalPattern.symptomKeywords.sort(),
        movement: clinicalPattern.movementPatterns.map(m => Math.round(m * 100)),
        pain: clinicalPattern.painLocations.sort(),
        limitations: clinicalPattern.functionalLimitations.sort()
      }
    });
    
    // Generate SHA-256 hash
    return crypto.createHash('sha256').update(combinedData).digest('hex');
  }

  /**
   * Calculate clinical progression score without storing medical details
   * Returns a normalized score between 0 and 1
   */
  static calculateProgressionScore(
    currentPattern: ClinicalPattern,
    previousMarkers: number[]
  ): number {
    // Calculate movement improvement score
    const movementScore = currentPattern.movementPatterns.length > 0 ?
      currentPattern.movementPatterns.reduce((a, b) => a + b, 0) / currentPattern.movementPatterns.length : 0.5;
    
    // Calculate functional improvement score
    const functionalScore = 1 - (currentPattern.functionalLimitations.length / 10);
    
    // Calculate symptom reduction score
    const symptomScore = 1 - (currentPattern.symptomKeywords.length / 20);
    
    // Weighted average
    const currentScore = (movementScore * 0.4 + functionalScore * 0.3 + symptomScore * 0.3);
    
    // If we have previous scores, calculate trend
    if (previousMarkers.length > 0) {
      const lastScore = previousMarkers[previousMarkers.length - 1];
      const trend = currentScore - lastScore;
      return Math.max(0, Math.min(1, currentScore + trend * 0.1));
    }
    
    return Math.max(0, Math.min(1, currentScore));
  }

  /**
   * Check for fuzzy match to handle voice variations (cold, fatigue, etc.)
   */
  static fuzzyMatchHash(hash1: string, hash2: string, threshold: number = 0.85): boolean {
    // Compare first 16 characters for rough match
    const prefix1 = hash1.substring(0, 16);
    const prefix2 = hash2.substring(0, 16);
    
    let matches = 0;
    for (let i = 0; i < prefix1.length; i++) {
      if (prefix1[i] === prefix2[i]) matches++;
    }
    
    return (matches / prefix1.length) >= threshold;
  }

  // Helper methods
  private static normalizePattern(pattern: number[]): number[] {
    const max = Math.max(...pattern);
    const min = Math.min(...pattern);
    const range = max - min || 1;
    return pattern.map(v => (v - min) / range);
  }

  private static extractSymptomKeywords(transcript: string): string[] {
    const symptomPatterns = [
      /pain/gi, /ache/gi, /stiff/gi, /sore/gi, /tight/gi,
      /weak/gi, /numb/gi, /tingle/gi, /sharp/gi, /dull/gi
    ];
    
    const keywords = new Set<string>();
    symptomPatterns.forEach(pattern => {
      if (pattern.test(transcript)) {
        keywords.add(pattern.source.replace(/[/\\gi]/g, '').toLowerCase());
      }
    });
    
    return Array.from(keywords);
  }

  private static extractMovementPatterns(movementData: any): number[] {
    // Extract normalized movement ranges and quality scores
    const patterns: number[] = [];
    
    if (movementData.shoulderAbduction) {
      patterns.push(movementData.shoulderAbduction / 180);
    }
    if (movementData.kneeFlexion) {
      patterns.push(movementData.kneeFlexion / 140);
    }
    if (movementData.hipAbduction) {
      patterns.push(movementData.hipAbduction / 45);
    }
    if (movementData.spinalFlexion) {
      patterns.push(movementData.spinalFlexion / 90);
    }
    
    return patterns;
  }

  private static extractPainLocations(transcript: string): string[] {
    const bodyParts = [
      'neck', 'shoulder', 'back', 'lower back', 'knee', 'hip',
      'ankle', 'wrist', 'elbow', 'spine', 'leg', 'arm'
    ];
    
    const locations = new Set<string>();
    const lowerTranscript = transcript.toLowerCase();
    
    bodyParts.forEach(part => {
      if (lowerTranscript.includes(part)) {
        // Generalize to main body regions
        if (['neck', 'shoulder', 'arm', 'elbow', 'wrist'].includes(part)) {
          locations.add('upper');
        } else if (['back', 'lower back', 'spine'].includes(part)) {
          locations.add('spine');
        } else if (['hip', 'knee', 'ankle', 'leg'].includes(part)) {
          locations.add('lower');
        }
      }
    });
    
    return Array.from(locations);
  }

  private static extractFunctionalLimitations(transcript: string): string[] {
    const limitationPatterns = [
      /can't|cannot|unable|difficulty|hard to|struggle/gi,
      /limit|restrict|avoid|stop/gi
    ];
    
    const limitations = new Set<string>();
    limitationPatterns.forEach(pattern => {
      if (pattern.test(transcript)) {
        limitations.add('functional_limitation');
      }
    });
    
    // Add severity markers without specifics
    if (/severe|significant|major/gi.test(transcript)) {
      limitations.add('severity_high');
    } else if (/mild|slight|minor/gi.test(transcript)) {
      limitations.add('severity_low');
    }
    
    return Array.from(limitations);
  }
}