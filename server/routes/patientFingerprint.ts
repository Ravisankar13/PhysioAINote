import { Router } from 'express';
import { storage } from '../storage';
import { PatientFingerprintService } from '../services/patientFingerprintService';

const router = Router();

/**
 * Process audio and transcript to generate patient fingerprint
 * Returns visit information if patient is recognized
 */
router.post('/api/patient-fingerprint/process', async (req, res) => {
  try {
    const { audioFeatures, transcript, movementData } = req.body;
    
    if (!audioFeatures || !transcript) {
      return res.status(400).json({ error: 'Audio features and transcript are required' });
    }
    
    // Extract patterns from the data
    const voicePattern = PatientFingerprintService.extractVoicePattern(audioFeatures);
    const clinicalPattern = PatientFingerprintService.extractClinicalPattern(transcript, movementData);
    
    // Generate patient hash
    const patientHash = PatientFingerprintService.generatePatientHash(voicePattern, clinicalPattern);
    
    // Check if patient exists
    let fingerprint = await storage.getPatientFingerprint(patientHash);
    
    if (fingerprint) {
      // Existing patient - update visit count
      const progressionScore = PatientFingerprintService.calculateProgressionScore(
        clinicalPattern,
        fingerprint.clinicalProgressionMarkers || []
      );
      
      fingerprint = await storage.updatePatientFingerprint(
        patientHash,
        fingerprint.visitCount + 1,
        progressionScore
      );
      
      // Calculate days since last visit
      const daysSinceLastVisit = Math.floor(
        (Date.now() - new Date(fingerprint.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      res.json({
        isReturningPatient: true,
        visitNumber: fingerprint.visitCount,
        daysSinceLastVisit,
        progressionTrend: calculateProgressionTrend(fingerprint.clinicalProgressionMarkers || []),
        message: `Welcome back! This is visit #${fingerprint.visitCount}. Last visit was ${daysSinceLastVisit} days ago.`
      });
    } else {
      // New patient - create fingerprint
      fingerprint = await storage.createPatientFingerprint({
        patientHash,
        visitCount: 1,
        clinicalProgressionMarkers: [0.5] // Baseline score
      });
      
      res.json({
        isReturningPatient: false,
        visitNumber: 1,
        message: 'New patient registered in the system.'
      });
    }
  } catch (error) {
    console.error('Error processing patient fingerprint:', error);
    res.status(500).json({ error: 'Failed to process patient fingerprint' });
  }
});

/**
 * Check for similar patients (fuzzy matching)
 * Helps identify patients even with voice changes
 */
router.post('/api/patient-fingerprint/check-similar', async (req, res) => {
  try {
    const { patientHash } = req.body;
    
    if (!patientHash) {
      return res.status(400).json({ error: 'Patient hash is required' });
    }
    
    const similarPatients = await storage.findSimilarPatientFingerprints(patientHash);
    
    if (similarPatients.length > 0) {
      res.json({
        hasSimilar: true,
        possibleMatches: similarPatients.map(fp => ({
          visitCount: fp.visitCount,
          lastVisitDate: fp.lastVisitDate,
          matchConfidence: calculateMatchConfidence(patientHash, fp.patientHash)
        }))
      });
    } else {
      res.json({
        hasSimilar: false,
        possibleMatches: []
      });
    }
  } catch (error) {
    console.error('Error checking similar patients:', error);
    res.status(500).json({ error: 'Failed to check similar patients' });
  }
});

/**
 * Get anonymized statistics about returning patients
 * No patient data is exposed
 */
router.get('/api/patient-fingerprint/stats', async (req, res) => {
  try {
    // This would query the database for anonymous statistics
    // For now, returning mock stats
    res.json({
      totalUniquePatients: 0,
      averageVisitsPerPatient: 0,
      returningPatientRate: 0,
      averageDaysBetweenVisits: 0
    });
  } catch (error) {
    console.error('Error fetching patient stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Helper functions
function calculateProgressionTrend(markers: number[]): string {
  if (markers.length < 2) return 'baseline';
  
  const recent = markers.slice(-3);
  const average = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previousAverage = markers.slice(-6, -3).reduce((a, b) => a + b, 0) / Math.min(3, markers.length - 3);
  
  if (average > previousAverage + 0.1) return 'improving';
  if (average < previousAverage - 0.1) return 'declining';
  return 'stable';
}

function calculateMatchConfidence(hash1: string, hash2: string): number {
  const prefix1 = hash1.substring(0, 16);
  const prefix2 = hash2.substring(0, 16);
  
  let matches = 0;
  for (let i = 0; i < prefix1.length; i++) {
    if (prefix1[i] === prefix2[i]) matches++;
  }
  
  return Math.round((matches / prefix1.length) * 100);
}

export default router;