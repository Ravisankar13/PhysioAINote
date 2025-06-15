import { useMemo, useCallback } from 'react';
import * as THREE from 'three';

interface TissueProperties {
  elasticity: number; // 0-1, how much tissue compresses
  viscosity: number; // 0-1, resistance to movement
  density: number; // 0-1, tissue firmness
  temperature: number; // 0-1, relative warmth
  texture: 'smooth' | 'rough' | 'fibrous' | 'granular';
  pathology?: {
    inflammation: number; // 0-1, increases temperature and sensitivity
    tension: number; // 0-1, increases resistance
    trigger_points: Array<{ position: THREE.Vector3; intensity: number }>;
  };
}

interface AnatomicalRegion {
  name: string;
  bounds: THREE.Box3;
  tissueType: 'skin' | 'muscle' | 'bone' | 'ligament' | 'tendon' | 'fascia';
  properties: TissueProperties;
  manualTherapyTechniques: string[];
}

export function useTissuePhysics(patientData?: any) {
  // Define tissue properties for different anatomical regions
  const anatomicalRegions = useMemo((): AnatomicalRegion[] => {
    const baseRegions: AnatomicalRegion[] = [
      {
        name: 'cervical_spine',
        bounds: new THREE.Box3(
          new THREE.Vector3(-0.1, 1.2, -0.1),
          new THREE.Vector3(0.1, 1.6, 0.1)
        ),
        tissueType: 'muscle',
        properties: {
          elasticity: 0.7,
          viscosity: 0.5,
          density: 0.6,
          temperature: 0.8,
          texture: 'fibrous'
        },
        manualTherapyTechniques: ['soft_tissue_mobilization', 'trigger_point_therapy']
      },
      {
        name: 'shoulder_left',
        bounds: new THREE.Box3(
          new THREE.Vector3(-0.6, 1.0, -0.2),
          new THREE.Vector3(-0.3, 1.4, 0.2)
        ),
        tissueType: 'muscle',
        properties: {
          elasticity: 0.6,
          viscosity: 0.4,
          density: 0.7,
          temperature: 0.7,
          texture: 'smooth'
        },
        manualTherapyTechniques: ['joint_mobilization', 'myofascial_release']
      },
      {
        name: 'shoulder_right',
        bounds: new THREE.Box3(
          new THREE.Vector3(0.3, 1.0, -0.2),
          new THREE.Vector3(0.6, 1.4, 0.2)
        ),
        tissueType: 'muscle',
        properties: {
          elasticity: 0.6,
          viscosity: 0.4,
          density: 0.7,
          temperature: 0.7,
          texture: 'smooth'
        },
        manualTherapyTechniques: ['joint_mobilization', 'myofascial_release']
      },
      {
        name: 'lumbar_spine',
        bounds: new THREE.Box3(
          new THREE.Vector3(-0.15, 0.4, -0.1),
          new THREE.Vector3(0.15, 1.0, 0.1)
        ),
        tissueType: 'muscle',
        properties: {
          elasticity: 0.5,
          viscosity: 0.6,
          density: 0.8,
          temperature: 0.6,
          texture: 'fibrous'
        },
        manualTherapyTechniques: ['spinal_manipulation', 'deep_tissue_massage']
      },
      {
        name: 'quadriceps_left',
        bounds: new THREE.Box3(
          new THREE.Vector3(-0.3, -0.2, -0.1),
          new THREE.Vector3(-0.1, 0.4, 0.1)
        ),
        tissueType: 'muscle',
        properties: {
          elasticity: 0.8,
          viscosity: 0.3,
          density: 0.9,
          temperature: 0.7,
          texture: 'smooth'
        },
        manualTherapyTechniques: ['deep_tissue_massage', 'compression_therapy']
      },
      {
        name: 'quadriceps_right',
        bounds: new THREE.Box3(
          new THREE.Vector3(0.1, -0.2, -0.1),
          new THREE.Vector3(0.3, 0.4, 0.1)
        ),
        tissueType: 'muscle',
        properties: {
          elasticity: 0.8,
          viscosity: 0.3,
          density: 0.9,
          temperature: 0.7,
          texture: 'smooth'
        },
        manualTherapyTechniques: ['deep_tissue_massage', 'compression_therapy']
      }
    ];

    // Apply patient-specific modifications
    if (patientData?.painAreas) {
      return baseRegions.map(region => {
        const isPainArea = patientData.painAreas.some((area: string) =>
          region.name.toLowerCase().includes(area.toLowerCase()) ||
          area.toLowerCase().includes(region.name.toLowerCase())
        );

        if (isPainArea) {
          return {
            ...region,
            properties: {
              ...region.properties,
              pathology: {
                inflammation: 0.7,
                tension: 0.8,
                trigger_points: [
                  {
                    position: region.bounds.getCenter(new THREE.Vector3()),
                    intensity: 0.9
                  }
                ]
              }
            }
          };
        }
        return region;
      });
    }

    return baseRegions;
  }, [patientData]);

  // Find anatomical region at intersection point
  const getRegionAtPoint = useCallback((point: THREE.Vector3): AnatomicalRegion | null => {
    for (const region of anatomicalRegions) {
      if (region.bounds.containsPoint(point)) {
        return region;
      }
    }
    return null;
  }, [anatomicalRegions]);

  // Calculate haptic feedback based on tissue properties and interaction
  const calculateFeedback = useCallback((
    intersectionPoint: THREE.Vector3,
    pressure: number, // 0-1
    movementVector: THREE.Vector3,
    technique: string
  ) => {
    const region = getRegionAtPoint(intersectionPoint);
    if (!region) {
      return {
        force: 0,
        duration: 0,
        pattern: 'continuous' as const,
        frequency: 0
      };
    }

    const { properties } = region;
    let baseResistance = properties.density * properties.viscosity;
    
    // Apply pathology modifiers
    if (properties.pathology) {
      baseResistance *= (1 + properties.pathology.tension);
      
      // Check proximity to trigger points
      for (const triggerPoint of properties.pathology.trigger_points) {
        const distance = intersectionPoint.distanceTo(triggerPoint.position);
        if (distance < 0.05) { // Within 5cm of trigger point
          baseResistance *= (1 + triggerPoint.intensity);
        }
      }
    }

    // Technique-specific modifiers
    let techniqueModifier = 1;
    switch (technique) {
      case 'deep_tissue_massage':
        techniqueModifier = 1.5; // Higher resistance for deep work
        break;
      case 'light_touch':
        techniqueModifier = 0.3; // Minimal resistance
        break;
      case 'joint_mobilization':
        techniqueModifier = 0.8; // Moderate resistance with movement
        break;
      case 'trigger_point_therapy':
        techniqueModifier = 2.0; // High resistance at specific points
        break;
    }

    // Calculate final feedback values
    const force = Math.min(baseResistance * techniqueModifier * pressure, 1.0);
    const duration = 100 + (properties.viscosity * 200); // 100-300ms based on viscosity
    
    // Determine feedback pattern based on tissue texture
    let pattern: 'pulse' | 'continuous' | 'wave' = 'continuous';
    let frequency = 0;
    
    switch (properties.texture) {
      case 'rough':
        pattern = 'pulse';
        frequency = 15; // 15Hz for rough texture
        break;
      case 'fibrous':
        pattern = 'wave';
        frequency = 8; // 8Hz for fibrous tissue
        break;
      case 'granular':
        pattern = 'pulse';
        frequency = 25; // 25Hz for granular feeling
        break;
      case 'smooth':
      default:
        pattern = 'continuous';
        frequency = 0;
        break;
    }

    return {
      force,
      duration,
      pattern,
      frequency,
      region: region.name,
      tissueType: region.tissueType,
      temperature: properties.temperature,
      pathology: properties.pathology
    };
  }, [getRegionAtPoint, anatomicalRegions]);

  // Validate manual therapy technique for specific region
  const isValidTechnique = useCallback((
    intersectionPoint: THREE.Vector3,
    technique: string
  ): boolean => {
    const region = getRegionAtPoint(intersectionPoint);
    if (!region) return false;
    
    return region.manualTherapyTechniques.includes(technique);
  }, [getRegionAtPoint]);

  // Get recommended techniques for a region
  const getRecommendedTechniques = useCallback((
    intersectionPoint: THREE.Vector3
  ): string[] => {
    const region = getRegionAtPoint(intersectionPoint);
    return region?.manualTherapyTechniques || [];
  }, [getRegionAtPoint]);

  // Calculate tissue deformation for visual feedback
  const calculateDeformation = useCallback((
    intersectionPoint: THREE.Vector3,
    pressure: number
  ): number => {
    const region = getRegionAtPoint(intersectionPoint);
    if (!region) return 0;

    // Deformation based on elasticity and pressure
    const maxDeformation = 0.02; // 2cm maximum deformation
    return region.properties.elasticity * pressure * maxDeformation;
  }, [getRegionAtPoint]);

  return {
    anatomicalRegions,
    getRegionAtPoint,
    calculateFeedback,
    isValidTechnique,
    getRecommendedTechniques,
    calculateDeformation
  };
}