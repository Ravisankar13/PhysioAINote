/**
 * Utility functions for de-identifying clinical notes for sharing
 * Removes personal identifiable information (PII) like name, DOB, etc.
 */

import { ClinicalNote } from '@shared/schema';

type DeIdentifiedNote = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

/**
 * Calculate an age range from a specific date of birth
 * @param dateOfBirth - The date of birth string
 * @returns A string representing the age range (e.g., "30-35", "60+")
 */
export function calculateAgeRange(dateOfBirth: string): string {
  // Parse the date of birth
  const dob = new Date(dateOfBirth);
  
  // Calculate age
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  // Define age ranges
  if (age < 18) {
    return 'Under 18';
  } else if (age < 30) {
    return '18-29';
  } else if (age < 40) {
    return '30-39';
  } else if (age < 50) {
    return '40-49';
  } else if (age < 60) {
    return '50-59';
  } else if (age < 70) {
    return '60-69';
  } else {
    return '70+';
  }
}

/**
 * Extract a general condition description from SOAP notes
 * @param note - The clinical note
 * @returns A string describing the general condition
 */
export function extractCondition(note: ClinicalNote): string {
  // Try to extract from assessment first as it usually contains the diagnosis
  if (note.assessment && note.assessment.length > 0) {
    // Extract the first sentence or up to 100 characters
    const firstSentence = note.assessment.split('.')[0];
    return firstSentence.length > 100 
      ? firstSentence.substring(0, 100) + '...' 
      : firstSentence;
  }
  
  // Fallback to objective findings
  if (note.objective && note.objective.length > 0) {
    const firstSentence = note.objective.split('.')[0];
    return firstSentence.length > 100 
      ? firstSentence.substring(0, 100) + '...' 
      : firstSentence;
  }
  
  return 'Undetermined condition';
}

/**
 * Create a de-identified version of a clinical note
 * @param note - The original clinical note with PII
 * @returns A de-identified version of the note
 */
export function deIdentifyNote(note: ClinicalNote): DeIdentifiedNote {
  // Remove any potential PII from the notes
  // This is a simple implementation - in production, you would want more sophisticated
  // NLP or regex patterns to identify and redact all potential PII
  
  // Remove patient name and ID references
  const patientNameRegex = new RegExp(note.patientName, 'gi');
  const patientIdRegex = new RegExp(note.patientId, 'gi');
  
  // Function to redact PII from text
  const redactPII = (text: string): string => {
    return text
      .replace(patientNameRegex, '[PATIENT]')
      .replace(patientIdRegex, '[ID]')
      // Add more patterns for other PII as needed
      .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, '[DOB]') // Simple date pattern
      .replace(/\d{3}-\d{2}-\d{4}/g, '[SSN]') // SSN pattern
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]') // Email pattern
      .replace(/\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[PHONE]'); // Phone number pattern
  };
  
  // Create the de-identified note
  return {
    subjective: redactPII(note.subjective),
    objective: redactPII(note.objective),
    assessment: redactPII(note.assessment),
    plan: redactPII(note.plan)
  };
}