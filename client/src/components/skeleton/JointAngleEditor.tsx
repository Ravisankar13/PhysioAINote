import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, RotateCcw, Link2, Activity, Target, ChevronDown, ChevronUp, X } from 'lucide-react';

export type DofGroup = 'spine' | 'lower' | 'upper';

export interface DofSpec {
  id: string;
  joint: string;
  property: string;
  label: string;
  shortLabel: string;
  group: DofGroup;
  section: string;
  side?: 'L' | 'R' | 'M';
  pairJoint?: string;
  searchKeywords?: string[];
  min: number;
  max: number;
  unit: string;
}

export const DOF_SPECS: DofSpec[] = [
  { id: 'spine.forwardHead', joint: 'spine', property: 'forwardHead', label: 'Spine Forward Head', shortLabel: 'Sp Fwd Head', group: 'spine', section: 'Spinal Curves', side: 'M', searchKeywords: ['forward head posture', 'protraction'], min: 0, max: 45, unit: '°' },
  { id: 'spine.lateralShift', joint: 'spine', property: 'lateralShift', label: 'Spine Lateral Shift', shortLabel: 'Sp Lat Shift', group: 'spine', section: 'Spinal Curves', side: 'M', searchKeywords: ['shift', 'list'], min: -30, max: 30, unit: '°' },
  { id: 'spine.cervicalLordosis', joint: 'spine', property: 'cervicalLordosis', label: 'Cervical Lordosis', shortLabel: 'Cerv Lordosis', group: 'spine', section: 'Spinal Curves', side: 'M', min: -60, max: 20, unit: '°' },
  { id: 'spine.thoracicKyphosis', joint: 'spine', property: 'thoracicKyphosis', label: 'Thoracic Kyphosis', shortLabel: 'Thor Kyphosis', group: 'spine', section: 'Spinal Curves', side: 'M', min: -20, max: 50, unit: '°' },
  { id: 'spine.lumbarLordosis', joint: 'spine', property: 'lumbarLordosis', label: 'Lumbar Lordosis', shortLabel: 'Lum Lordosis', group: 'spine', section: 'Spinal Curves', side: 'M', min: -70, max: 20, unit: '°' },
  { id: 'spine.scoliosis', joint: 'spine', property: 'scoliosis', label: 'Scoliosis', shortLabel: 'Scoliosis', group: 'spine', section: 'Spinal Curves', side: 'M', min: -45, max: 45, unit: '°' },
  { id: 'spine.cervicalRotation', joint: 'spine', property: 'cervicalRotation', label: 'Cervical Rotation', shortLabel: 'Cerv Rot', group: 'spine', section: 'Spinal Rotation', side: 'M', min: -80, max: 80, unit: '°' },
  { id: 'spine.cervicalLateralFlexion', joint: 'spine', property: 'cervicalLateralFlexion', label: 'Cervical Lateral Flexion', shortLabel: 'Cerv Lat Flex', group: 'spine', section: 'Spinal Rotation', side: 'M', min: -45, max: 45, unit: '°' },
  { id: 'spine.thoracicRotation', joint: 'spine', property: 'thoracicRotation', label: 'Thoracic Rotation', shortLabel: 'Thor Rot', group: 'spine', section: 'Spinal Rotation', side: 'M', min: -45, max: 45, unit: '°' },
  { id: 'spine.lumbarRotation', joint: 'spine', property: 'lumbarRotation', label: 'Lumbar Rotation', shortLabel: 'Lum Rot', group: 'spine', section: 'Spinal Rotation', side: 'M', min: -30, max: 30, unit: '°' },
  { id: 'neck.flexion', joint: 'neck', property: 'flexion', label: 'Neck Flexion', shortLabel: 'Neck Flex', group: 'spine', section: 'Head & Neck', side: 'M', min: 0, max: 60, unit: '°' },
  { id: 'neck.extension', joint: 'neck', property: 'extension', label: 'Neck Extension', shortLabel: 'Neck Ext', group: 'spine', section: 'Head & Neck', side: 'M', min: 0, max: 75, unit: '°' },
  { id: 'neck.rotation', joint: 'neck', property: 'rotation', label: 'Neck Rotation', shortLabel: 'Neck Rot', group: 'spine', section: 'Head & Neck', side: 'M', min: -80, max: 80, unit: '°' },
  { id: 'neck.lateralFlexion', joint: 'neck', property: 'lateralFlexion', label: 'Neck Lateral Flexion', shortLabel: 'Neck Lat Flex', group: 'spine', section: 'Head & Neck', side: 'M', min: -45, max: 45, unit: '°' },
  { id: 'neck.forwardHead', joint: 'neck', property: 'forwardHead', label: 'Forward Head Posture', shortLabel: 'Fwd Head', group: 'spine', section: 'Head & Neck', side: 'M', min: 0, max: 45, unit: '°' },
  { id: 'pelvis.tilt', joint: 'pelvis', property: 'tilt', label: 'Pelvic Tilt', shortLabel: 'Pelvic Tilt', group: 'spine', section: 'Pelvic Alignment', side: 'M', min: -30, max: 30, unit: '°' },
  { id: 'pelvis.obliquity', joint: 'pelvis', property: 'obliquity', label: 'Pelvic Obliquity', shortLabel: 'Pelvic Obl', group: 'spine', section: 'Pelvic Alignment', side: 'M', min: -20, max: 20, unit: '°' },
  { id: 'pelvis.rotation', joint: 'pelvis', property: 'rotation', label: 'Pelvic Rotation', shortLabel: 'Pelvic Rot', group: 'spine', section: 'Pelvic Alignment', side: 'M', min: -30, max: 30, unit: '°' },
  { id: 'pelvis.drop', joint: 'pelvis', property: 'drop', label: 'Pelvic Drop', shortLabel: 'Pelvic Drop', group: 'spine', section: 'Pelvic Alignment', side: 'M', searchKeywords: ['trendelenburg', 'hip drop'], min: -20, max: 20, unit: '°' },

  { id: 'leftHip.flexion', joint: 'leftHip', property: 'flexion', label: 'Left Hip Flexion', shortLabel: 'L Hip Flex', group: 'lower', section: 'Hip', side: 'L', pairJoint: 'rightHip', min: 0, max: 120, unit: '°' },
  { id: 'leftHip.extension', joint: 'leftHip', property: 'extension', label: 'Left Hip Extension', shortLabel: 'L Hip Ext', group: 'lower', section: 'Hip', side: 'L', pairJoint: 'rightHip', min: 0, max: 120, unit: '°' },
  { id: 'leftHip.abduction', joint: 'leftHip', property: 'abduction', label: 'Left Hip Abduction', shortLabel: 'L Hip Abd', group: 'lower', section: 'Hip', side: 'L', pairJoint: 'rightHip', min: -45, max: 45, unit: '°' },
  { id: 'leftHip.internalRotation', joint: 'leftHip', property: 'internalRotation', label: 'Left Hip Int Rotation', shortLabel: 'L Hip IR', group: 'lower', section: 'Hip', side: 'L', pairJoint: 'rightHip', min: -45, max: 45, unit: '°' },
  { id: 'leftHip.anteversion', joint: 'leftHip', property: 'anteversion', label: 'Left Hip Anteversion', shortLabel: 'L Hip Antev', group: 'lower', section: 'Hip', side: 'L', pairJoint: 'rightHip', searchKeywords: ['retroversion'], min: -20, max: 40, unit: '°' },
  { id: 'leftHip.neckShaftAngle', joint: 'leftHip', property: 'neckShaftAngle', label: 'Left Hip Neck-Shaft Angle', shortLabel: 'L NSA', group: 'lower', section: 'Hip', side: 'L', pairJoint: 'rightHip', searchKeywords: ['coxa vara', 'coxa valga'], min: -20, max: 20, unit: '°' },
  { id: 'rightHip.flexion', joint: 'rightHip', property: 'flexion', label: 'Right Hip Flexion', shortLabel: 'R Hip Flex', group: 'lower', section: 'Hip', side: 'R', pairJoint: 'leftHip', min: 0, max: 120, unit: '°' },
  { id: 'rightHip.extension', joint: 'rightHip', property: 'extension', label: 'Right Hip Extension', shortLabel: 'R Hip Ext', group: 'lower', section: 'Hip', side: 'R', pairJoint: 'leftHip', min: 0, max: 120, unit: '°' },
  { id: 'rightHip.abduction', joint: 'rightHip', property: 'abduction', label: 'Right Hip Abduction', shortLabel: 'R Hip Abd', group: 'lower', section: 'Hip', side: 'R', pairJoint: 'leftHip', min: -45, max: 45, unit: '°' },
  { id: 'rightHip.internalRotation', joint: 'rightHip', property: 'internalRotation', label: 'Right Hip Int Rotation', shortLabel: 'R Hip IR', group: 'lower', section: 'Hip', side: 'R', pairJoint: 'leftHip', min: -45, max: 45, unit: '°' },
  { id: 'rightHip.anteversion', joint: 'rightHip', property: 'anteversion', label: 'Right Hip Anteversion', shortLabel: 'R Hip Antev', group: 'lower', section: 'Hip', side: 'R', pairJoint: 'leftHip', searchKeywords: ['retroversion'], min: -20, max: 40, unit: '°' },
  { id: 'rightHip.neckShaftAngle', joint: 'rightHip', property: 'neckShaftAngle', label: 'Right Hip Neck-Shaft Angle', shortLabel: 'R NSA', group: 'lower', section: 'Hip', side: 'R', pairJoint: 'leftHip', searchKeywords: ['coxa vara', 'coxa valga'], min: -20, max: 20, unit: '°' },

  { id: 'leftKnee.flexion', joint: 'leftKnee', property: 'flexion', label: 'Left Knee Flexion', shortLabel: 'L Knee Flex', group: 'lower', section: 'Knee', side: 'L', pairJoint: 'rightKnee', min: -10, max: 140, unit: '°' },
  { id: 'leftKnee.varus', joint: 'leftKnee', property: 'varus', label: 'Left Knee Varus/Valgus', shortLabel: 'L Knee Var', group: 'lower', section: 'Knee', side: 'L', pairJoint: 'rightKnee', searchKeywords: ['valgus', 'varus'], min: -20, max: 20, unit: '°' },
  { id: 'leftKnee.tibialTorsion', joint: 'leftKnee', property: 'tibialTorsion', label: 'Left Tibial Torsion', shortLabel: 'L Tib Tors', group: 'lower', section: 'Knee', side: 'L', pairJoint: 'rightKnee', min: -30, max: 30, unit: '°' },
  { id: 'leftKnee.recurvatum', joint: 'leftKnee', property: 'recurvatum', label: 'Left Knee Recurvatum', shortLabel: 'L Recurv', group: 'lower', section: 'Knee', side: 'L', pairJoint: 'rightKnee', searchKeywords: ['hyperextension'], min: 0, max: 30, unit: '°' },
  { id: 'leftKnee.tibialSlope', joint: 'leftKnee', property: 'tibialSlope', label: 'Left Tibial Slope', shortLabel: 'L Tib Slope', group: 'lower', section: 'Knee', side: 'L', pairJoint: 'rightKnee', min: 0, max: 20, unit: '°' },
  { id: 'leftKnee.patellaAlta', joint: 'leftKnee', property: 'patellaAlta', label: 'Left Patella Alta', shortLabel: 'L Pat Alta', group: 'lower', section: 'Knee', side: 'L', pairJoint: 'rightKnee', searchKeywords: ['baja', 'patellar height'], min: -10, max: 20, unit: '°' },
  { id: 'rightKnee.flexion', joint: 'rightKnee', property: 'flexion', label: 'Right Knee Flexion', shortLabel: 'R Knee Flex', group: 'lower', section: 'Knee', side: 'R', pairJoint: 'leftKnee', min: -10, max: 140, unit: '°' },
  { id: 'rightKnee.varus', joint: 'rightKnee', property: 'varus', label: 'Right Knee Varus/Valgus', shortLabel: 'R Knee Var', group: 'lower', section: 'Knee', side: 'R', pairJoint: 'leftKnee', searchKeywords: ['valgus', 'varus'], min: -20, max: 20, unit: '°' },
  { id: 'rightKnee.tibialTorsion', joint: 'rightKnee', property: 'tibialTorsion', label: 'Right Tibial Torsion', shortLabel: 'R Tib Tors', group: 'lower', section: 'Knee', side: 'R', pairJoint: 'leftKnee', min: -30, max: 30, unit: '°' },
  { id: 'rightKnee.recurvatum', joint: 'rightKnee', property: 'recurvatum', label: 'Right Knee Recurvatum', shortLabel: 'R Recurv', group: 'lower', section: 'Knee', side: 'R', pairJoint: 'leftKnee', searchKeywords: ['hyperextension'], min: 0, max: 30, unit: '°' },
  { id: 'rightKnee.tibialSlope', joint: 'rightKnee', property: 'tibialSlope', label: 'Right Tibial Slope', shortLabel: 'R Tib Slope', group: 'lower', section: 'Knee', side: 'R', pairJoint: 'leftKnee', min: 0, max: 20, unit: '°' },
  { id: 'rightKnee.patellaAlta', joint: 'rightKnee', property: 'patellaAlta', label: 'Right Patella Alta', shortLabel: 'R Pat Alta', group: 'lower', section: 'Knee', side: 'R', pairJoint: 'leftKnee', searchKeywords: ['baja', 'patellar height'], min: -10, max: 20, unit: '°' },

  { id: 'leftAnkle.dorsiflexion', joint: 'leftAnkle', property: 'dorsiflexion', label: 'Left Ankle Dorsiflexion', shortLabel: 'L Ank DF', group: 'lower', section: 'Ankle', side: 'L', pairJoint: 'rightAnkle', min: 0, max: 30, unit: '°' },
  { id: 'leftAnkle.plantarflexion', joint: 'leftAnkle', property: 'plantarflexion', label: 'Left Ankle Plantarflexion', shortLabel: 'L Ank PF', group: 'lower', section: 'Ankle', side: 'L', pairJoint: 'rightAnkle', min: 0, max: 50, unit: '°' },
  { id: 'leftAnkle.inversion', joint: 'leftAnkle', property: 'inversion', label: 'Left Ankle Inversion', shortLabel: 'L Ank Inv', group: 'lower', section: 'Ankle', side: 'L', pairJoint: 'rightAnkle', min: 0, max: 35, unit: '°' },
  { id: 'leftAnkle.eversion', joint: 'leftAnkle', property: 'eversion', label: 'Left Ankle Eversion', shortLabel: 'L Ank Ev', group: 'lower', section: 'Ankle', side: 'L', pairJoint: 'rightAnkle', searchKeywords: ['pronation'], min: 0, max: 20, unit: '°' },
  { id: 'leftAnkle.archHeight', joint: 'leftAnkle', property: 'archHeight', label: 'Left Arch Height', shortLabel: 'L Arch', group: 'lower', section: 'Ankle', side: 'L', pairJoint: 'rightAnkle', searchKeywords: ['pes planus', 'pes cavus', 'flat foot', 'high arch'], min: -20, max: 20, unit: '°' },
  { id: 'rightAnkle.dorsiflexion', joint: 'rightAnkle', property: 'dorsiflexion', label: 'Right Ankle Dorsiflexion', shortLabel: 'R Ank DF', group: 'lower', section: 'Ankle', side: 'R', pairJoint: 'leftAnkle', min: 0, max: 30, unit: '°' },
  { id: 'rightAnkle.plantarflexion', joint: 'rightAnkle', property: 'plantarflexion', label: 'Right Ankle Plantarflexion', shortLabel: 'R Ank PF', group: 'lower', section: 'Ankle', side: 'R', pairJoint: 'leftAnkle', min: 0, max: 50, unit: '°' },
  { id: 'rightAnkle.inversion', joint: 'rightAnkle', property: 'inversion', label: 'Right Ankle Inversion', shortLabel: 'R Ank Inv', group: 'lower', section: 'Ankle', side: 'R', pairJoint: 'leftAnkle', min: 0, max: 35, unit: '°' },
  { id: 'rightAnkle.eversion', joint: 'rightAnkle', property: 'eversion', label: 'Right Ankle Eversion', shortLabel: 'R Ank Ev', group: 'lower', section: 'Ankle', side: 'R', pairJoint: 'leftAnkle', searchKeywords: ['pronation'], min: 0, max: 20, unit: '°' },
  { id: 'rightAnkle.archHeight', joint: 'rightAnkle', property: 'archHeight', label: 'Right Arch Height', shortLabel: 'R Arch', group: 'lower', section: 'Ankle', side: 'R', pairJoint: 'leftAnkle', searchKeywords: ['pes planus', 'pes cavus', 'flat foot', 'high arch'], min: -20, max: 20, unit: '°' },

  { id: 'leftShoulder.flexion', joint: 'leftShoulder', property: 'flexion', label: 'Left Shoulder Flexion', shortLabel: 'L Sh Flex', group: 'upper', section: 'Shoulder', side: 'L', pairJoint: 'rightShoulder', min: -180, max: 180, unit: '°' },
  { id: 'leftShoulder.abduction', joint: 'leftShoulder', property: 'abduction', label: 'Left Shoulder Abduction', shortLabel: 'L Sh Abd', group: 'upper', section: 'Shoulder', side: 'L', pairJoint: 'rightShoulder', min: -180, max: 180, unit: '°' },
  { id: 'leftShoulder.internalRotation', joint: 'leftShoulder', property: 'internalRotation', label: 'Left Shoulder Int Rotation', shortLabel: 'L Sh IR', group: 'upper', section: 'Shoulder', side: 'L', pairJoint: 'rightShoulder', min: -90, max: 90, unit: '°' },
  { id: 'leftShoulder.externalRotation', joint: 'leftShoulder', property: 'externalRotation', label: 'Left Shoulder Ext Rotation', shortLabel: 'L Sh ER', group: 'upper', section: 'Shoulder', side: 'L', pairJoint: 'rightShoulder', min: -90, max: 90, unit: '°' },
  { id: 'leftShoulder.elevation', joint: 'leftShoulder', property: 'elevation', label: 'Left Shoulder Elevation', shortLabel: 'L Sh Elev', group: 'upper', section: 'Shoulder', side: 'L', pairJoint: 'rightShoulder', min: -30, max: 30, unit: '°' },
  { id: 'leftShoulder.retroversion', joint: 'leftShoulder', property: 'retroversion', label: 'Left Shoulder Retroversion', shortLabel: 'L Sh RetV', group: 'upper', section: 'Shoulder', side: 'L', pairJoint: 'rightShoulder', searchKeywords: ['anteversion'], min: -30, max: 60, unit: '°' },
  { id: 'leftShoulder.protraction', joint: 'leftShoulder', property: 'protraction', label: 'Left Shoulder Protraction', shortLabel: 'L Sh Prot', group: 'upper', section: 'Shoulder', side: 'L', pairJoint: 'rightShoulder', min: -20, max: 30, unit: '°' },
  { id: 'leftShoulder.winging', joint: 'leftShoulder', property: 'winging', label: 'Left Shoulder Winging', shortLabel: 'L Sh Wing', group: 'upper', section: 'Shoulder', side: 'L', pairJoint: 'rightShoulder', min: 0, max: 30, unit: '°' },
  { id: 'rightShoulder.flexion', joint: 'rightShoulder', property: 'flexion', label: 'Right Shoulder Flexion', shortLabel: 'R Sh Flex', group: 'upper', section: 'Shoulder', side: 'R', pairJoint: 'leftShoulder', min: -180, max: 180, unit: '°' },
  { id: 'rightShoulder.abduction', joint: 'rightShoulder', property: 'abduction', label: 'Right Shoulder Abduction', shortLabel: 'R Sh Abd', group: 'upper', section: 'Shoulder', side: 'R', pairJoint: 'leftShoulder', min: -180, max: 180, unit: '°' },
  { id: 'rightShoulder.internalRotation', joint: 'rightShoulder', property: 'internalRotation', label: 'Right Shoulder Int Rotation', shortLabel: 'R Sh IR', group: 'upper', section: 'Shoulder', side: 'R', pairJoint: 'leftShoulder', min: -90, max: 90, unit: '°' },
  { id: 'rightShoulder.externalRotation', joint: 'rightShoulder', property: 'externalRotation', label: 'Right Shoulder Ext Rotation', shortLabel: 'R Sh ER', group: 'upper', section: 'Shoulder', side: 'R', pairJoint: 'leftShoulder', min: -90, max: 90, unit: '°' },
  { id: 'rightShoulder.elevation', joint: 'rightShoulder', property: 'elevation', label: 'Right Shoulder Elevation', shortLabel: 'R Sh Elev', group: 'upper', section: 'Shoulder', side: 'R', pairJoint: 'leftShoulder', min: -30, max: 30, unit: '°' },
  { id: 'rightShoulder.retroversion', joint: 'rightShoulder', property: 'retroversion', label: 'Right Shoulder Retroversion', shortLabel: 'R Sh RetV', group: 'upper', section: 'Shoulder', side: 'R', pairJoint: 'leftShoulder', searchKeywords: ['anteversion'], min: -30, max: 60, unit: '°' },
  { id: 'rightShoulder.protraction', joint: 'rightShoulder', property: 'protraction', label: 'Right Shoulder Protraction', shortLabel: 'R Sh Prot', group: 'upper', section: 'Shoulder', side: 'R', pairJoint: 'leftShoulder', min: -20, max: 30, unit: '°' },
  { id: 'rightShoulder.winging', joint: 'rightShoulder', property: 'winging', label: 'Right Shoulder Winging', shortLabel: 'R Sh Wing', group: 'upper', section: 'Shoulder', side: 'R', pairJoint: 'leftShoulder', min: 0, max: 30, unit: '°' },

  { id: 'leftScapula.protraction', joint: 'leftScapula', property: 'protraction', label: 'Left Scapula Protraction', shortLabel: 'L Sca Prot', group: 'upper', section: 'Scapula', side: 'L', pairJoint: 'rightScapula', min: -30, max: 30, unit: '°' },
  { id: 'leftScapula.retraction', joint: 'leftScapula', property: 'retraction', label: 'Left Scapula Retraction', shortLabel: 'L Sca Retr', group: 'upper', section: 'Scapula', side: 'L', pairJoint: 'rightScapula', min: 0, max: 30, unit: '°' },
  { id: 'leftScapula.elevation', joint: 'leftScapula', property: 'elevation', label: 'Left Scapula Elevation', shortLabel: 'L Sca Elev', group: 'upper', section: 'Scapula', side: 'L', pairJoint: 'rightScapula', min: -20, max: 30, unit: '°' },
  { id: 'leftScapula.depression', joint: 'leftScapula', property: 'depression', label: 'Left Scapula Depression', shortLabel: 'L Sca Depr', group: 'upper', section: 'Scapula', side: 'L', pairJoint: 'rightScapula', min: 0, max: 20, unit: '°' },
  { id: 'leftScapula.upwardRotation', joint: 'leftScapula', property: 'upwardRotation', label: 'Left Scapula Upward Rotation', shortLabel: 'L Sca UR', group: 'upper', section: 'Scapula', side: 'L', pairJoint: 'rightScapula', min: -20, max: 60, unit: '°' },
  { id: 'leftScapula.downwardRotation', joint: 'leftScapula', property: 'downwardRotation', label: 'Left Scapula Downward Rotation', shortLabel: 'L Sca DR', group: 'upper', section: 'Scapula', side: 'L', pairJoint: 'rightScapula', min: 0, max: 30, unit: '°' },
  { id: 'leftScapula.anteriorTilt', joint: 'leftScapula', property: 'anteriorTilt', label: 'Left Scapula Anterior Tilt', shortLabel: 'L Sca AT', group: 'upper', section: 'Scapula', side: 'L', pairJoint: 'rightScapula', min: -20, max: 30, unit: '°' },
  { id: 'leftScapula.posteriorTilt', joint: 'leftScapula', property: 'posteriorTilt', label: 'Left Scapula Posterior Tilt', shortLabel: 'L Sca PT', group: 'upper', section: 'Scapula', side: 'L', pairJoint: 'rightScapula', min: -20, max: 30, unit: '°' },
  { id: 'leftScapula.winging', joint: 'leftScapula', property: 'winging', label: 'Left Scapula Winging', shortLabel: 'L Sca Wing', group: 'upper', section: 'Scapula', side: 'L', pairJoint: 'rightScapula', min: 0, max: 30, unit: '°' },
  { id: 'leftScapula.clavicleRotation', joint: 'leftScapula', property: 'clavicleRotation', label: 'Left Clavicle Rotation', shortLabel: 'L Clav Rot', group: 'upper', section: 'Scapula', side: 'L', pairJoint: 'rightScapula', min: -30, max: 30, unit: '°' },
  { id: 'rightScapula.protraction', joint: 'rightScapula', property: 'protraction', label: 'Right Scapula Protraction', shortLabel: 'R Sca Prot', group: 'upper', section: 'Scapula', side: 'R', pairJoint: 'leftScapula', min: -30, max: 30, unit: '°' },
  { id: 'rightScapula.retraction', joint: 'rightScapula', property: 'retraction', label: 'Right Scapula Retraction', shortLabel: 'R Sca Retr', group: 'upper', section: 'Scapula', side: 'R', pairJoint: 'leftScapula', min: 0, max: 30, unit: '°' },
  { id: 'rightScapula.elevation', joint: 'rightScapula', property: 'elevation', label: 'Right Scapula Elevation', shortLabel: 'R Sca Elev', group: 'upper', section: 'Scapula', side: 'R', pairJoint: 'leftScapula', min: -20, max: 30, unit: '°' },
  { id: 'rightScapula.depression', joint: 'rightScapula', property: 'depression', label: 'Right Scapula Depression', shortLabel: 'R Sca Depr', group: 'upper', section: 'Scapula', side: 'R', pairJoint: 'leftScapula', min: 0, max: 20, unit: '°' },
  { id: 'rightScapula.upwardRotation', joint: 'rightScapula', property: 'upwardRotation', label: 'Right Scapula Upward Rotation', shortLabel: 'R Sca UR', group: 'upper', section: 'Scapula', side: 'R', pairJoint: 'leftScapula', min: -20, max: 60, unit: '°' },
  { id: 'rightScapula.downwardRotation', joint: 'rightScapula', property: 'downwardRotation', label: 'Right Scapula Downward Rotation', shortLabel: 'R Sca DR', group: 'upper', section: 'Scapula', side: 'R', pairJoint: 'leftScapula', min: 0, max: 30, unit: '°' },
  { id: 'rightScapula.anteriorTilt', joint: 'rightScapula', property: 'anteriorTilt', label: 'Right Scapula Anterior Tilt', shortLabel: 'R Sca AT', group: 'upper', section: 'Scapula', side: 'R', pairJoint: 'leftScapula', min: -20, max: 30, unit: '°' },
  { id: 'rightScapula.posteriorTilt', joint: 'rightScapula', property: 'posteriorTilt', label: 'Right Scapula Posterior Tilt', shortLabel: 'R Sca PT', group: 'upper', section: 'Scapula', side: 'R', pairJoint: 'leftScapula', min: -20, max: 30, unit: '°' },
  { id: 'rightScapula.winging', joint: 'rightScapula', property: 'winging', label: 'Right Scapula Winging', shortLabel: 'R Sca Wing', group: 'upper', section: 'Scapula', side: 'R', pairJoint: 'leftScapula', min: 0, max: 30, unit: '°' },
  { id: 'rightScapula.clavicleRotation', joint: 'rightScapula', property: 'clavicleRotation', label: 'Right Clavicle Rotation', shortLabel: 'R Clav Rot', group: 'upper', section: 'Scapula', side: 'R', pairJoint: 'leftScapula', min: -30, max: 30, unit: '°' },

  { id: 'leftElbow.flexion', joint: 'leftElbow', property: 'flexion', label: 'Left Elbow Flexion', shortLabel: 'L Elb Flex', group: 'upper', section: 'Elbow', side: 'L', pairJoint: 'rightElbow', min: 0, max: 145, unit: '°' },
  { id: 'leftElbow.carryingAngle', joint: 'leftElbow', property: 'carryingAngle', label: 'Left Elbow Carrying Angle', shortLabel: 'L Elb CA', group: 'upper', section: 'Elbow', side: 'L', pairJoint: 'rightElbow', searchKeywords: ['cubitus valgus', 'cubitus varus'], min: -15, max: 25, unit: '°' },
  { id: 'leftElbow.pronation', joint: 'leftElbow', property: 'pronation', label: 'Left Forearm Pronation', shortLabel: 'L Pron', group: 'upper', section: 'Elbow', side: 'L', pairJoint: 'rightElbow', searchKeywords: ['supination'], min: -90, max: 90, unit: '°' },
  { id: 'rightElbow.flexion', joint: 'rightElbow', property: 'flexion', label: 'Right Elbow Flexion', shortLabel: 'R Elb Flex', group: 'upper', section: 'Elbow', side: 'R', pairJoint: 'leftElbow', min: 0, max: 145, unit: '°' },
  { id: 'rightElbow.carryingAngle', joint: 'rightElbow', property: 'carryingAngle', label: 'Right Elbow Carrying Angle', shortLabel: 'R Elb CA', group: 'upper', section: 'Elbow', side: 'R', pairJoint: 'leftElbow', searchKeywords: ['cubitus valgus', 'cubitus varus'], min: -15, max: 25, unit: '°' },
  { id: 'rightElbow.pronation', joint: 'rightElbow', property: 'pronation', label: 'Right Forearm Pronation', shortLabel: 'R Pron', group: 'upper', section: 'Elbow', side: 'R', pairJoint: 'leftElbow', searchKeywords: ['supination'], min: -90, max: 90, unit: '°' },

  { id: 'leftWrist.flexion', joint: 'leftWrist', property: 'flexion', label: 'Left Wrist Flexion', shortLabel: 'L Wr Flex', group: 'upper', section: 'Wrist', side: 'L', pairJoint: 'rightWrist', searchKeywords: ['extension'], min: -80, max: 80, unit: '°' },
  { id: 'leftWrist.deviation', joint: 'leftWrist', property: 'deviation', label: 'Left Wrist Deviation', shortLabel: 'L Wr Dev', group: 'upper', section: 'Wrist', side: 'L', pairJoint: 'rightWrist', searchKeywords: ['radial', 'ulnar'], min: -30, max: 30, unit: '°' },
  { id: 'rightWrist.flexion', joint: 'rightWrist', property: 'flexion', label: 'Right Wrist Flexion', shortLabel: 'R Wr Flex', group: 'upper', section: 'Wrist', side: 'R', pairJoint: 'leftWrist', searchKeywords: ['extension'], min: -80, max: 80, unit: '°' },
  { id: 'rightWrist.deviation', joint: 'rightWrist', property: 'deviation', label: 'Right Wrist Deviation', shortLabel: 'R Wr Dev', group: 'upper', section: 'Wrist', side: 'R', pairJoint: 'leftWrist', searchKeywords: ['radial', 'ulnar'], min: -30, max: 30, unit: '°' },
];

export type ModelConfigLike = Record<string, Record<string, number>>;

interface Props {
  modelConfig: ModelConfigLike;
  onAngleChange: (joint: string, property: string, value: number) => void;
  onJumpToJoint?: (joint: string) => void;
  bilateralLink: boolean;
  onBilateralLinkChange: (linked: boolean) => void;
  /** External signal to focus a specific DOF row (e.g., from region-zoom integration). */
  focusDofId?: string | null;
  /** External signal to focus a joint group (jumps the editor tab + scrolls to the joint section). */
  focusJoint?: string | null;
}

interface RowProps {
  spec: DofSpec;
  value: number;
  pairValue: number | null;
  onChange: (value: number) => void;
  onJumpToJoint?: (joint: string) => void;
  bilateralLink: boolean;
  isFocused?: boolean;
  registerRef?: (id: string, el: HTMLDivElement | null) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function EditorRow({ spec, value, pairValue, onChange, onJumpToJoint, bilateralLink, isFocused, registerRef }: RowProps) {
  const [draftText, setDraftText] = useState<string>(String(Math.round(value)));
  const [editing, setEditing] = useState(false);
  const [pulse, setPulse] = useState(false);
  const lastValueRef = useRef(value);
  const dragStateRef = useRef<{ startX: number; startVal: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { registerRef?.(spec.id, containerRef.current); return () => registerRef?.(spec.id, null); }, [spec.id, registerRef]);

  useEffect(() => {
    if (!editing) setDraftText(String(Math.round(value)));
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 350);
      return () => clearTimeout(t);
    }
  }, [value, editing]);

  const apply = useCallback((v: number) => {
    const next = clamp(Math.round(v), spec.min, spec.max);
    if (next !== value) onChange(next);
  }, [spec.min, spec.max, value, onChange]);

  const nudge = (delta: number) => apply(value + delta);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.shiftKey ? 5 : 1;
    apply(value + (e.deltaY < 0 ? step : -step));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = { startX: e.clientX, startVal: value };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStateRef.current) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const range = spec.max - spec.min;
    const sensitivity = e.shiftKey ? range / 800 : range / 200;
    apply(dragStateRef.current.startVal + dx * sensitivity);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStateRef.current) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    dragStateRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); nudge(e.shiftKey ? 10 : 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(e.shiftKey ? -10 : -1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const n = Number(draftText);
      if (!Number.isNaN(n)) apply(n);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraftText(String(Math.round(value)));
      setEditing(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  const sliderPct = ((value - spec.min) / (spec.max - spec.min)) * 100;
  const isAtDefault = value === 0;
  const showMirror = bilateralLink && spec.pairJoint && pairValue !== null && pairValue !== value;

  return (
    <div
      ref={containerRef}
      className={`group p-2 rounded-md border transition-colors ${
        isFocused
          ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
          : pulse
            ? 'border-primary/60 bg-primary/5'
            : 'border-transparent hover:bg-muted/40'
      }`}
      onWheel={handleWheel}
      data-testid={`row-dof-${spec.id}`}
      data-focused={isFocused ? 'true' : 'false'}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onJumpToJoint?.(spec.joint)}
          className="flex-1 min-w-0 text-left text-xs font-medium truncate hover:text-primary"
          title={`Jump to ${spec.joint}`}
        >
          {spec.label}
        </button>
        {showMirror && (
          <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5">
            <Link2 className="h-2.5 w-2.5" />mirror
          </Badge>
        )}
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => nudge(-10)} title="−10° (Shift+Wheel/Arrow)" data-testid={`btn-dec10-${spec.id}`}>
          <span className="text-[10px] font-bold">−10</span>
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => nudge(-1)} title="−1°" data-testid={`btn-dec1-${spec.id}`}>
          <span className="text-xs font-bold">−</span>
        </Button>
        <div
          className="relative w-16 cursor-ew-resize select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          title="Drag to scrub (hold Shift for fine control)"
        >
          <Input
            type="text"
            inputMode="numeric"
            value={draftText}
            onChange={(e) => { setDraftText(e.target.value); setEditing(true); }}
            onFocus={() => setEditing(true)}
            onBlur={() => {
              setEditing(false);
              const n = Number(draftText);
              if (!Number.isNaN(n)) apply(n);
              else setDraftText(String(Math.round(value)));
            }}
            onKeyDown={handleKeyDown}
            className="h-7 w-full px-1 text-center text-xs font-mono tabular-nums"
            data-testid={`input-dof-${spec.id}`}
          />
          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">{spec.unit}</span>
        </div>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => nudge(1)} title="+1°" data-testid={`btn-inc1-${spec.id}`}>
          <span className="text-xs font-bold">+</span>
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => nudge(10)} title="+10° (Shift+Wheel/Arrow)" data-testid={`btn-inc10-${spec.id}`}>
          <span className="text-[10px] font-bold">+10</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          disabled={isAtDefault}
          onClick={() => apply(0)}
          title="Reset to 0°"
          data-testid={`btn-reset-${spec.id}`}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-[9px] text-muted-foreground tabular-nums w-8 text-right">{spec.min}°</span>
        <div className="relative flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`absolute top-0 bottom-0 ${pulse ? 'bg-primary' : 'bg-primary/60'}`}
            style={{
              left: spec.min < 0 ? `${((0 - spec.min) / (spec.max - spec.min)) * 100}%` : '0%',
              width: spec.min < 0
                ? `${Math.abs(value) / (spec.max - spec.min) * 100}%`
                : `${sliderPct}%`,
              transform: spec.min < 0 && value < 0 ? 'translateX(-100%)' : undefined,
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary border border-background shadow"
            style={{ left: `calc(${sliderPct}% - 4px)` }}
          />
        </div>
        <span className="text-[9px] text-muted-foreground tabular-nums w-8">{spec.max}°</span>
      </div>
    </div>
  );
}

export default function JointAngleEditor({
  modelConfig,
  onAngleChange,
  onJumpToJoint,
  bilateralLink,
  onBilateralLinkChange,
  focusDofId,
  focusJoint,
}: Props) {
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<DofGroup>('lower');
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [selectedJoint, setSelectedJoint] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    rowRefs.current[id] = el;
  }, []);

  const focusRow = useCallback((dofId: string) => {
    const spec = DOF_SPECS.find(d => d.id === dofId);
    if (!spec) return;
    setSearch('');
    setActiveGroup(spec.group);
    setFocusedRowId(dofId);
    requestAnimationFrame(() => {
      const el = rowRefs.current[dofId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    setTimeout(() => setFocusedRowId(prev => (prev === dofId ? null : prev)), 1800);
  }, []);

  // External focus signals — from search results (focusDofId) or region zoom (focusJoint).
  useEffect(() => {
    if (focusDofId) focusRow(focusDofId);
  }, [focusDofId, focusRow]);

  useEffect(() => {
    if (!focusJoint) return;
    setSelectedJoint(focusJoint);
    const first = DOF_SPECS.find(d => d.joint === focusJoint);
    if (first) focusRow(first.id);
  }, [focusJoint, focusRow]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return DOF_SPECS.filter(d =>
      d.label.toLowerCase().includes(q) ||
      d.joint.toLowerCase().includes(q) ||
      d.property.toLowerCase().includes(q) ||
      d.section.toLowerCase().includes(q) ||
      (d.searchKeywords ?? []).some(k => k.toLowerCase().includes(q))
    ).slice(0, 12);
  }, [search]);

  const getValue = useCallback((spec: DofSpec): number => {
    return Math.round(modelConfig?.[spec.joint]?.[spec.property] ?? 0);
  }, [modelConfig]);

  const getPairValue = useCallback((spec: DofSpec): number | null => {
    if (!spec.pairJoint) return null;
    return Math.round(modelConfig?.[spec.pairJoint]?.[spec.property] ?? 0);
  }, [modelConfig]);

  const handleChange = useCallback((spec: DofSpec, value: number) => {
    onAngleChange(spec.joint, spec.property, value);
    if (bilateralLink && spec.pairJoint) {
      onAngleChange(spec.pairJoint, spec.property, value);
    }
  }, [onAngleChange, bilateralLink]);

  const resetSection = useCallback((rows: DofSpec[]) => {
    const seen = new Set<string>();
    rows.forEach(spec => {
      const key = `${spec.joint}.${spec.property}`;
      if (seen.has(key)) return;
      seen.add(key);
      onAngleChange(spec.joint, spec.property, 0);
      if (spec.pairJoint) onAngleChange(spec.pairJoint, spec.property, 0);
    });
  }, [onAngleChange]);

  const renderRows = (specs: DofSpec[]) => {
    const sections = new Map<string, DofSpec[]>();
    for (const s of specs) {
      if (!sections.has(s.section)) sections.set(s.section, []);
      sections.get(s.section)!.push(s);
    }
    return (
      <div className="space-y-3">
        {Array.from(sections.entries()).map(([section, rows]) => (
          <div key={section}>
            <div className="flex items-center justify-between px-2 mb-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{section}</div>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1.5 text-[9px] gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => resetSection(rows)}
                title={`Reset all ${section} angles to neutral`}
                data-testid={`btn-reset-section-${section.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <RotateCcw className="h-2.5 w-2.5" />Reset {section}
              </Button>
            </div>
            <div className="space-y-1">
              {rows.map(spec => (
                <EditorRow
                  key={spec.id}
                  spec={spec}
                  value={getValue(spec)}
                  pairValue={getPairValue(spec)}
                  onChange={(v) => handleChange(spec, v)}
                  onJumpToJoint={onJumpToJoint}
                  bilateralLink={bilateralLink}
                  isFocused={focusedRowId === spec.id}
                  registerRef={registerRef}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const groupSpecs: Record<DofGroup, DofSpec[]> = useMemo(() => ({
    spine: DOF_SPECS.filter(d => d.group === 'spine'),
    lower: DOF_SPECS.filter(d => d.group === 'lower'),
    upper: DOF_SPECS.filter(d => d.group === 'upper'),
  }), []);

  const jointChips = useMemo(() => {
    const order = ['neck', 'spine', 'pelvis',
      'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle',
      'leftScapula', 'rightScapula', 'leftShoulder', 'rightShoulder',
      'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist'];
    const labelMap: Record<string, string> = {
      neck: 'Neck', spine: 'Spine', pelvis: 'Pelvis',
      leftHip: 'L Hip', rightHip: 'R Hip',
      leftKnee: 'L Knee', rightKnee: 'R Knee',
      leftAnkle: 'L Ankle', rightAnkle: 'R Ankle',
      leftScapula: 'L Scap', rightScapula: 'R Scap',
      leftShoulder: 'L Shldr', rightShoulder: 'R Shldr',
      leftElbow: 'L Elbow', rightElbow: 'R Elbow',
      leftWrist: 'L Wrist', rightWrist: 'R Wrist',
    };
    const present = new Set(DOF_SPECS.map(d => d.joint));
    return order.filter(j => present.has(j)).map(j => ({ joint: j, label: labelMap[j] ?? j }));
  }, []);

  const selectedJointSpecs = useMemo(() => {
    if (!selectedJoint) return null;
    return DOF_SPECS.filter(d => d.joint === selectedJoint);
  }, [selectedJoint]);

  const resetJoint = useCallback((joint: string) => {
    const specs = DOF_SPECS.filter(d => d.joint === joint);
    const seen = new Set<string>();
    specs.forEach(spec => {
      const key = `${spec.joint}.${spec.property}`;
      if (seen.has(key)) return;
      seen.add(key);
      onAngleChange(spec.joint, spec.property, 0);
      if (bilateralLink && spec.pairJoint) onAngleChange(spec.pairJoint, spec.property, 0);
    });
  }, [onAngleChange, bilateralLink]);

  return (
    <Card data-testid="card-joint-angle-editor">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Quick Joint Angle Editor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              id="bilateral-mirror"
              checked={bilateralLink}
              onCheckedChange={onBilateralLinkChange}
              data-testid="switch-bilateral-mirror"
            />
            <Label htmlFor="bilateral-mirror" className="text-xs flex items-center gap-1 cursor-pointer">
              <Link2 className="h-3 w-3" />Mirror L↔R
            </Label>
          </div>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search angle (e.g. left hip flexion, anteversion, valgus)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
            data-testid="input-search-dof"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Joint picker chips - 1-click access to any joint's DOFs */}
        <div className="flex flex-wrap gap-1 mb-3 pb-2 border-b" data-testid="joint-picker">
          <Button
            size="sm"
            variant={selectedJoint === null ? 'default' : 'outline'}
            className="h-6 px-2 text-[10px]"
            onClick={() => setSelectedJoint(null)}
            data-testid="chip-joint-all"
          >
            All
          </Button>
          {jointChips.map(c => (
            <Button
              key={c.joint}
              size="sm"
              variant={selectedJoint === c.joint ? 'default' : 'outline'}
              className="h-6 px-2 text-[10px]"
              onClick={() => { setSelectedJoint(c.joint); setSearch(''); }}
              data-testid={`chip-joint-${c.joint}`}
            >
              {c.label}
            </Button>
          ))}
        </div>

        {/* Selected joint detail panel - focused DOFs + Reset this joint */}
        {selectedJoint && selectedJointSpecs && !filtered && (
          <div className="mb-3 p-2 rounded-md border border-primary/40 bg-primary/5" data-testid="selected-joint-panel">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <Target className="h-3 w-3 text-primary" />
                {jointChips.find(c => c.joint === selectedJoint)?.label ?? selectedJoint}
                <span className="text-[10px] font-normal text-muted-foreground">
                  · {selectedJointSpecs.length} DOF{selectedJointSpecs.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() => resetJoint(selectedJoint)}
                  data-testid="btn-reset-this-joint"
                  title={`Reset all ${selectedJoint} angles to neutral`}
                >
                  <RotateCcw className="h-3 w-3" />Reset this joint
                </Button>
                {onJumpToJoint && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => onJumpToJoint(selectedJoint)}
                    data-testid="btn-jump-to-this-joint"
                  >
                    Open
                  </Button>
                )}
              </div>
            </div>
            <ScrollArea className="h-[260px] pr-2">
              <div className="space-y-1">
                {selectedJointSpecs.map(spec => (
                  <EditorRow
                    key={spec.id}
                    spec={spec}
                    value={getValue(spec)}
                    pairValue={getPairValue(spec)}
                    onChange={(v) => handleChange(spec, v)}
                    onJumpToJoint={onJumpToJoint}
                    bilateralLink={bilateralLink}
                    isFocused={focusedRowId === spec.id}
                    registerRef={registerRef}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {filtered ? (
          <ScrollArea className="h-[420px] pr-2">
            {filtered.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">No matching joint angles.</div>
            ) : (
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground px-2 flex items-center justify-between">
                  <span>{filtered.length} match{filtered.length === 1 ? '' : 'es'} — click a row to jump &amp; focus</span>
                  {filtered.length === 1 && (
                    <Button size="sm" variant="ghost" className="h-5 text-[10px] gap-1" onClick={() => focusRow(filtered[0].id)}>
                      Focus this angle
                    </Button>
                  )}
                </div>
                <div className="space-y-1">
                  {filtered.map(spec => (
                    <div key={spec.id} onClick={() => focusRow(spec.id)} className="cursor-pointer" data-testid={`search-result-${spec.id}`}>
                      <EditorRow
                        spec={spec}
                        value={getValue(spec)}
                        pairValue={getPairValue(spec)}
                        onChange={(v) => handleChange(spec, v)}
                        onJumpToJoint={onJumpToJoint}
                        bilateralLink={bilateralLink}
                        isFocused={focusedRowId === spec.id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        ) : (
          <Tabs value={activeGroup} onValueChange={(v) => setActiveGroup(v as DofGroup)}>
            <TabsList className="grid grid-cols-3 w-full h-8">
              <TabsTrigger value="spine" className="text-xs" data-testid="tab-editor-spine">Spine & Pelvis</TabsTrigger>
              <TabsTrigger value="lower" className="text-xs" data-testid="tab-editor-lower">Lower Body</TabsTrigger>
              <TabsTrigger value="upper" className="text-xs" data-testid="tab-editor-upper">Upper Body</TabsTrigger>
            </TabsList>
            <TabsContent value="spine" className="mt-3">
              <ScrollArea className="h-[420px] pr-2">{renderRows(groupSpecs.spine)}</ScrollArea>
            </TabsContent>
            <TabsContent value="lower" className="mt-3">
              <ScrollArea className="h-[420px] pr-2">{renderRows(groupSpecs.lower)}</ScrollArea>
            </TabsContent>
            <TabsContent value="upper" className="mt-3">
              <ScrollArea className="h-[420px] pr-2">{renderRows(groupSpecs.upper)}</ScrollArea>
            </TabsContent>
          </Tabs>
        )}
        <div className="mt-3 pt-2 border-t flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Activity className="h-2.5 w-2.5" />Drag · Wheel · ±1/±10 · Type · ↑↓</span>
          <span className="ml-auto">Hold <kbd className="px-1 bg-muted rounded">Shift</kbd> for finer / coarser</span>
        </div>
      </CardContent>
    </Card>
  );
}
