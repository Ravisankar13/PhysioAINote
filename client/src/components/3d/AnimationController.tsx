import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface AnimationControllerProps {
  mixer?: THREE.AnimationMixer;
  animations: THREE.AnimationClip[];
  onAnimationChange?: (clipName: string) => void;
}

// Clinical animation presets
const CLINICAL_ANIMATIONS = {
  'idle': { name: 'Idle', description: 'Standing neutral position' },
  'walking': { name: 'Walking', description: 'Normal gait cycle' },
  'armFlexion': { name: 'Arm Flexion', description: 'Shoulder flexion test' },
  'armAbduction': { name: 'Arm Abduction', description: 'Shoulder abduction test' },
  'squat': { name: 'Squat', description: 'Hip and knee flexion' },
  'lunge': { name: 'Forward Lunge', description: 'Single leg strength test' },
  'sideBend': { name: 'Side Bend', description: 'Lateral spine flexion' },
  'neckRotation': { name: 'Neck Rotation', description: 'Cervical rotation test' },
  'hipRotation': { name: 'Hip Rotation', description: 'Hip internal/external rotation' },
  'kneeFlexion': { name: 'Knee Flexion', description: 'Knee bend test' },
};

export default function AnimationController({
  mixer,
  animations,
  onAnimationChange
}: AnimationControllerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<string>('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [blendDuration, setBlendDuration] = useState(0.5);
  
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const clockRef = useRef(new THREE.Clock());

  // Update animation frame
  useEffect(() => {
    if (!mixer || !isPlaying) return;

    const animate = () => {
      const delta = clockRef.current.getDelta();
      mixer.update(delta * playbackSpeed);
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [mixer, isPlaying, playbackSpeed]);

  // Handle animation change
  const changeAnimation = (clipName: string) => {
    if (!mixer || !animations.length) return;

    // Find the animation clip
    const clip = animations.find(a => a.name === clipName);
    if (!clip) {
      console.warn(`Animation clip "${clipName}" not found`);
      return;
    }

    // Stop current action with blend
    if (currentActionRef.current) {
      currentActionRef.current.fadeOut(blendDuration);
    }

    // Play new action
    const newAction = mixer.clipAction(clip);
    newAction.fadeIn(blendDuration);
    newAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
    newAction.play();

    currentActionRef.current = newAction;
    setCurrentAnimation(clipName);
    setIsPlaying(true);

    if (onAnimationChange) {
      onAnimationChange(clipName);
    }
  };

  // Control functions
  const togglePlayPause = () => {
    if (!mixer || !currentActionRef.current) return;

    if (isPlaying) {
      currentActionRef.current.paused = true;
    } else {
      currentActionRef.current.paused = false;
    }
    setIsPlaying(!isPlaying);
  };

  const resetAnimation = () => {
    if (!mixer || !currentActionRef.current) return;
    
    currentActionRef.current.reset();
    currentActionRef.current.play();
    setIsPlaying(true);
  };

  const stopAnimation = () => {
    if (!mixer || !currentActionRef.current) return;
    
    currentActionRef.current.stop();
    currentActionRef.current = null;
    setCurrentAnimation('');
    setIsPlaying(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Animation Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Animation Selection */}
        <div className="space-y-2">
          <Label>Select Animation</Label>
          <Select value={currentAnimation} onValueChange={changeAnimation}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a clinical movement" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CLINICAL_ANIMATIONS).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex flex-col">
                    <span className="font-medium">{value.name}</span>
                    <span className="text-xs text-muted-foreground">{value.description}</span>
                  </div>
                </SelectItem>
              ))}
              {/* Add actual loaded animations */}
              {animations.map(clip => (
                <SelectItem key={clip.name} value={clip.name}>
                  {clip.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Playback Controls */}
        <div className="flex gap-2">
          <Button
            onClick={togglePlayPause}
            disabled={!currentAnimation}
            variant="outline"
            size="sm"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button
            onClick={resetAnimation}
            disabled={!currentAnimation}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={stopAnimation}
            disabled={!currentAnimation}
            variant="outline"
            size="sm"
          >
            Stop
          </Button>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <Label>Playback Speed: {playbackSpeed.toFixed(1)}x</Label>
          <Slider
            value={[playbackSpeed]}
            onValueChange={([value]) => setPlaybackSpeed(value)}
            min={0.1}
            max={2}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Blend Duration */}
        <div className="space-y-2">
          <Label>Animation Blend: {blendDuration.toFixed(1)}s</Label>
          <Slider
            value={[blendDuration]}
            onValueChange={([value]) => setBlendDuration(value)}
            min={0}
            max={2}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Loop Toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="loop"
            checked={loop}
            onChange={(e) => setLoop(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="loop">Loop Animation</Label>
        </div>

        {/* Animation Info */}
        {currentAnimation && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Current Animation</p>
            <p className="text-xs text-muted-foreground">
              {CLINICAL_ANIMATIONS[currentAnimation as keyof typeof CLINICAL_ANIMATIONS]?.description || 
               `Playing: ${currentAnimation}`}
            </p>
            {mixer && (
              <p className="text-xs text-muted-foreground mt-1">
                Duration: {currentActionRef.current?.getClip().duration.toFixed(2)}s
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export animation utilities
export function createAnimationClip(
  name: string,
  duration: number,
  tracks: THREE.KeyframeTrack[]
): THREE.AnimationClip {
  return new THREE.AnimationClip(name, duration, tracks);
}

export function createRotationTrack(
  boneName: string,
  times: number[],
  rotations: number[]
): THREE.QuaternionKeyframeTrack {
  return new THREE.QuaternionKeyframeTrack(
    `${boneName}.quaternion`,
    times,
    rotations
  );
}

export function createPositionTrack(
  boneName: string,
  times: number[],
  positions: number[]
): THREE.VectorKeyframeTrack {
  return new THREE.VectorKeyframeTrack(
    `${boneName}.position`,
    times,
    positions
  );
}