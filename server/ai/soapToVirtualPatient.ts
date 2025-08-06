import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface VirtualPatientFromSOAP {
  patientName: string;
  condition: string;
  limbScales: {
    leftArm: number;
    rightArm: number;
    leftLeg: number;
    rightLeg: number;
  };
  shoulderPathology: {
    leftShoulder: {
      flexion: number;
      extension: number;
      abduction: number;
      adduction: number;
      internalRotation: number;
      externalRotation: number;
    };
    rightShoulder: {
      flexion: number;
      extension: number;
      abduction: number;
      adduction: number;
      internalRotation: number;
      externalRotation: number;
    };
  };
  spinalPathology: {
    cervicalLordosis: number;
    thoracicKyphosis: number;
    lumbarLordosis: number;
    lateralFlexionLeft: number;
    lateralFlexionRight: number;
    rotation: number;
  };
  lowerLimbPathology: {
    hipFlexion: { left: number; right: number };
    hipExtension: { left: number; right: number };
    hipAbduction: { left: number; right: number };
    kneeFlexion: { left: number; right: number };
    kneeExtension: { left: number; right: number };
    ankleFlexion: { left: number; right: number };
    ankleDorsiflexion: { left: number; right: number };
  };
  gaitPattern: string;
  movementQuality: number;
  painLocations: string[];
  functionalLimitations: string[];
}

export async function generateVirtualPatientFromSOAP(
  soapNote: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    transcript?: string;
  }
): Promise<VirtualPatientFromSOAP> {
  try {
    const soapContent = `
      SOAP Note Content:
      Subjective: ${soapNote.subjective || 'Not provided'}
      Objective: ${soapNote.objective || 'Not provided'}
      Assessment: ${soapNote.assessment || 'Not provided'}
      Plan: ${soapNote.plan || 'Not provided'}
      ${soapNote.transcript ? `Full Transcript: ${soapNote.transcript}` : ''}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert physiotherapist analyzing SOAP notes to create accurate 3D virtual patient models. 
          Extract clinical information and convert it to specific biomechanical parameters.
          
          IMPORTANT RANGE OF MOTION RULES:
          - Normal ROM values should be 100 (representing 100% of normal)
          - Restricted ROM should be less than 100 (e.g., 50 for 50% restriction)
          - Hypermobile ROM should be greater than 100 (e.g., 120 for 20% hypermobility)
          - If no restriction mentioned, use 100 (normal)
          
          LIMB SCALE RULES:
          - Normal limb scale is 1.0
          - Atrophy/smaller limb: 0.8-0.95
          - Swelling/edema: 1.05-1.2
          
          SPINAL CURVATURE RULES:
          - Normal values are 0
          - Positive values increase curvature
          - Negative values decrease curvature
          - Range: -50 to 50
          
          GAIT PATTERNS:
          Choose from: normal, antalgic, trendelenburg, ataxic, hemiplegic, parkinsonian, steppage
          
          Respond with JSON containing all virtual patient parameters.`
        },
        {
          role: "user",
          content: `Analyze this SOAP note and generate virtual patient parameters:\n\n${soapContent}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Ensure all required fields with defaults
    return {
      patientName: result.patientName || "Virtual Patient",
      condition: result.condition || "Unspecified condition",
      limbScales: {
        leftArm: result.limbScales?.leftArm || 1.0,
        rightArm: result.limbScales?.rightArm || 1.0,
        leftLeg: result.limbScales?.leftLeg || 1.0,
        rightLeg: result.limbScales?.rightLeg || 1.0
      },
      shoulderPathology: {
        leftShoulder: {
          flexion: result.shoulderPathology?.leftShoulder?.flexion || 100,
          extension: result.shoulderPathology?.leftShoulder?.extension || 100,
          abduction: result.shoulderPathology?.leftShoulder?.abduction || 100,
          adduction: result.shoulderPathology?.leftShoulder?.adduction || 100,
          internalRotation: result.shoulderPathology?.leftShoulder?.internalRotation || 100,
          externalRotation: result.shoulderPathology?.leftShoulder?.externalRotation || 100
        },
        rightShoulder: {
          flexion: result.shoulderPathology?.rightShoulder?.flexion || 100,
          extension: result.shoulderPathology?.rightShoulder?.extension || 100,
          abduction: result.shoulderPathology?.rightShoulder?.abduction || 100,
          adduction: result.shoulderPathology?.rightShoulder?.adduction || 100,
          internalRotation: result.shoulderPathology?.rightShoulder?.internalRotation || 100,
          externalRotation: result.shoulderPathology?.rightShoulder?.externalRotation || 100
        }
      },
      spinalPathology: {
        cervicalLordosis: result.spinalPathology?.cervicalLordosis || 0,
        thoracicKyphosis: result.spinalPathology?.thoracicKyphosis || 0,
        lumbarLordosis: result.spinalPathology?.lumbarLordosis || 0,
        lateralFlexionLeft: result.spinalPathology?.lateralFlexionLeft || 0,
        lateralFlexionRight: result.spinalPathology?.lateralFlexionRight || 0,
        rotation: result.spinalPathology?.rotation || 0
      },
      lowerLimbPathology: {
        hipFlexion: {
          left: result.lowerLimbPathology?.hipFlexion?.left || 100,
          right: result.lowerLimbPathology?.hipFlexion?.right || 100
        },
        hipExtension: {
          left: result.lowerLimbPathology?.hipExtension?.left || 100,
          right: result.lowerLimbPathology?.hipExtension?.right || 100
        },
        hipAbduction: {
          left: result.lowerLimbPathology?.hipAbduction?.left || 100,
          right: result.lowerLimbPathology?.hipAbduction?.right || 100
        },
        kneeFlexion: {
          left: result.lowerLimbPathology?.kneeFlexion?.left || 100,
          right: result.lowerLimbPathology?.kneeFlexion?.right || 100
        },
        kneeExtension: {
          left: result.lowerLimbPathology?.kneeExtension?.left || 100,
          right: result.lowerLimbPathology?.kneeExtension?.right || 100
        },
        ankleFlexion: {
          left: result.lowerLimbPathology?.ankleFlexion?.left || 100,
          right: result.lowerLimbPathology?.ankleFlexion?.right || 100
        },
        ankleDorsiflexion: {
          left: result.lowerLimbPathology?.ankleDorsiflexion?.left || 100,
          right: result.lowerLimbPathology?.ankleDorsiflexion?.right || 100
        }
      },
      gaitPattern: result.gaitPattern || "normal",
      movementQuality: result.movementQuality || 75,
      painLocations: result.painLocations || [],
      functionalLimitations: result.functionalLimitations || []
    };
  } catch (error) {
    console.error('Error generating virtual patient from SOAP:', error);
    throw new Error('Failed to generate virtual patient from SOAP note');
  }
}

// Extract specific conditions from SOAP text
export async function extractClinicalConditions(soapText: string): Promise<{
  primaryDiagnosis: string;
  secondaryConditions: string[];
  redFlags: string[];
  movementDysfunctions: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Extract clinical conditions and movement dysfunctions from SOAP notes.
          Identify:
          1. Primary diagnosis/condition
          2. Secondary conditions
          3. Red flags (serious pathology indicators)
          4. Movement dysfunctions (compensations, restrictions, abnormal patterns)
          
          Use standard medical terminology. Respond in JSON format.`
        },
        {
          role: "user",
          content: soapText
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error extracting conditions:', error);
    return {
      primaryDiagnosis: 'Unspecified',
      secondaryConditions: [],
      redFlags: [],
      movementDysfunctions: []
    };
  }
}