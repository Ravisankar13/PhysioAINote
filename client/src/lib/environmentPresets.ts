export interface EnvironmentPreset {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  background: number;
  fog?: { color: number; near: number; far: number };
  ambientLight: { color: number; intensity: number };
  directionalLight: { color: number; intensity: number; position: [number, number, number] };
  backLight: { color: number; intensity: number; position: [number, number, number] };
  grid: { size: number; divisions: number; color1: number; color2: number };
  floor?: { color: number; opacity: number };
}

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  {
    id: 'clinical_dark',
    name: 'Clinical Dark',
    description: 'Default dark clinical setting',
    thumbnail: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    background: 0x1a1a2e,
    ambientLight: { color: 0xffffff, intensity: 0.5 },
    directionalLight: { color: 0xffffff, intensity: 1, position: [5, 10, 7.5] },
    backLight: { color: 0xffffff, intensity: 0.3, position: [-5, -5, -5] },
    grid: { size: 10, divisions: 10, color1: 0x333366, color2: 0x222244 },
  },
  {
    id: 'clinical_white',
    name: 'Clinical White',
    description: 'Bright clean studio',
    thumbnail: 'linear-gradient(135deg, #e8edf2, #cdd5de)',
    background: 0xe8edf2,
    ambientLight: { color: 0xffffff, intensity: 0.8 },
    directionalLight: { color: 0xffffff, intensity: 1.2, position: [5, 12, 8] },
    backLight: { color: 0xf0f0ff, intensity: 0.5, position: [-5, 5, -5] },
    grid: { size: 10, divisions: 10, color1: 0xb0b8c4, color2: 0xc8d0da },
    floor: { color: 0xd5dde6, opacity: 0.3 },
  },
  {
    id: 'rehab_gym',
    name: 'Rehab Gym',
    description: 'Warm rehabilitation gym',
    thumbnail: 'linear-gradient(135deg, #2d1f0e, #4a3520)',
    background: 0x1c1408,
    fog: { color: 0x1c1408, near: 8, far: 25 },
    ambientLight: { color: 0xffe8c8, intensity: 0.45 },
    directionalLight: { color: 0xffd699, intensity: 1.1, position: [6, 10, 5] },
    backLight: { color: 0xffcc80, intensity: 0.25, position: [-4, 3, -6] },
    grid: { size: 10, divisions: 20, color1: 0x5c4020, color2: 0x3a2a14 },
    floor: { color: 0x4a3520, opacity: 0.15 },
  },
  {
    id: 'outdoor_park',
    name: 'Outdoor Park',
    description: 'Natural park setting',
    thumbnail: 'linear-gradient(135deg, #87ceeb, #228b22)',
    background: 0x1a3a2a,
    fog: { color: 0x1a3a2a, near: 10, far: 30 },
    ambientLight: { color: 0xc8e8ff, intensity: 0.6 },
    directionalLight: { color: 0xfff4d6, intensity: 1.3, position: [8, 15, 5] },
    backLight: { color: 0x88bbff, intensity: 0.35, position: [-6, 4, -8] },
    grid: { size: 10, divisions: 10, color1: 0x2d5a3a, color2: 0x1e4028 },
    floor: { color: 0x2d5a3a, opacity: 0.2 },
  },
  {
    id: 'sports_field',
    name: 'Sports Field',
    description: 'Stadium-style lighting',
    thumbnail: 'linear-gradient(135deg, #0a1628, #1a3a1a)',
    background: 0x0a1628,
    ambientLight: { color: 0xd0e8ff, intensity: 0.4 },
    directionalLight: { color: 0xffffff, intensity: 1.5, position: [10, 15, 3] },
    backLight: { color: 0xffffff, intensity: 0.6, position: [-8, 12, -5] },
    grid: { size: 10, divisions: 20, color1: 0x1a5a1a, color2: 0x0e3a0e },
    floor: { color: 0x1a5a1a, opacity: 0.15 },
  },
  {
    id: 'home_exercise',
    name: 'Home Exercise',
    description: 'Cozy home environment',
    thumbnail: 'linear-gradient(135deg, #2a2018, #3d3028)',
    background: 0x1e1810,
    fog: { color: 0x1e1810, near: 10, far: 28 },
    ambientLight: { color: 0xffe4c4, intensity: 0.55 },
    directionalLight: { color: 0xffeedd, intensity: 0.9, position: [4, 8, 6] },
    backLight: { color: 0xffddbb, intensity: 0.3, position: [-3, 4, -4] },
    grid: { size: 10, divisions: 10, color1: 0x4a3828, color2: 0x342820 },
    floor: { color: 0x4a3828, opacity: 0.2 },
  },
];

export const DEFAULT_ENVIRONMENT = 'clinical_dark';

export function getEnvironmentPreset(id: string): EnvironmentPreset {
  return ENVIRONMENT_PRESETS.find(e => e.id === id) || ENVIRONMENT_PRESETS[0];
}
