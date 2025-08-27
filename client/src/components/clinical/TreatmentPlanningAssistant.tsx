import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Target,
  Activity,
  Home,
  Clock,
  TrendingUp,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Download,
  ChevronRight,
  Dumbbell,
  Heart,
  Brain,
  Timer,
  Users,
  CheckCircle,
  BarChart3,
  Zap,
  Repeat,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  id: string;
  name: string;
  category: 'strengthening' | 'stretching' | 'mobility' | 'neuromuscular' | 'cardio' | 'functional';
  sets?: number;
  reps?: string;
  hold?: number;
  duration?: number;
  frequency?: string;
  intensity?: string;
  progression?: string;
  precautions?: string;
  equipment?: string[];
  videoUrl?: string;
}

interface TreatmentPhase {
  id: string;
  name: string;
  duration: string;
  goals: string[];
  exercises: Exercise[];
  manualTherapy?: string[];
  modalities?: string[];
  precautions?: string[];
  progressionCriteria?: string[];
}

interface TreatmentPlan {
  diagnosis: string;
  duration: string;
  frequency: string;
  phases: TreatmentPhase[];
  homeProgram: Exercise[];
  outcomes: string[];
  reassessmentDate?: string;
}

interface TreatmentPlanningAssistantProps {
  onGeneratePlan?: (plan: TreatmentPlan) => void;
  onExportPlan?: (plan: TreatmentPlan) => void;
  patientInfo?: {
    diagnosis?: string;
    goals?: string[];
    limitations?: string[];
  };
}

// Comprehensive exercise database with proper exercises for various conditions
const exerciseDatabase: Exercise[] = [
  // Shoulder/Rotator Cuff Exercises
  {
    id: 'shoulder1',
    name: 'Pendulum Exercises (Codman)',
    category: 'mobility',
    sets: 3,
    reps: '10-15 each direction',
    intensity: 'Gentle passive movement',
    equipment: [],
    precautions: 'Support trunk, let arm hang freely'
  },
  {
    id: 'shoulder2',
    name: 'Isometric External Rotation',
    category: 'strengthening',
    sets: 3,
    hold: 5,
    reps: '10-15',
    intensity: 'Sub-maximal (30-50% effort)',
    progression: 'Increase hold time, then resistance',
    equipment: []
  },
  {
    id: 'shoulder3',
    name: 'Scapular Wall Slides',
    category: 'strengthening',
    sets: 3,
    reps: '10-15',
    intensity: 'Body weight',
    progression: 'Add resistance band',
    equipment: ['Wall']
  },
  {
    id: 'shoulder4',
    name: 'External Rotation with Band',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Light resistance',
    progression: 'Increase resistance, add elevation',
    equipment: ['Resistance band']
  },
  {
    id: 'shoulder5',
    name: 'Internal Rotation with Band',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Light resistance',
    progression: 'Increase resistance',
    equipment: ['Resistance band']
  },
  {
    id: 'shoulder6',
    name: 'Prone T\'s (Lower Trapezius)',
    category: 'strengthening',
    sets: 3,
    reps: '10-12',
    intensity: 'Body weight to light weights',
    progression: 'Add 1-2 lb weights',
    equipment: ['Light dumbbells (optional)']
  },
  {
    id: 'shoulder7',
    name: 'Prone Y\'s (Lower Trapezius)',
    category: 'strengthening',
    sets: 3,
    reps: '10-12',
    intensity: 'Body weight to light weights',
    equipment: ['Light dumbbells (optional)']
  },
  {
    id: 'shoulder8',
    name: 'Sleeper Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Gentle stretch',
    equipment: [],
    precautions: 'Avoid excessive pressure'
  },
  {
    id: 'shoulder9',
    name: 'Cross-Body Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Gentle to moderate',
    equipment: []
  },
  {
    id: 'shoulder10',
    name: 'Serratus Anterior Punch',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Light resistance',
    equipment: ['Resistance band']
  },
  
  // Knee/Lower Extremity Exercises
  {
    id: 'knee1',
    name: 'Quadriceps Sets',
    category: 'strengthening',
    sets: 3,
    reps: '10-15',
    hold: 5,
    intensity: 'Maximal contraction',
    equipment: []
  },
  {
    id: 'knee2',
    name: 'Straight Leg Raises',
    category: 'strengthening',
    sets: 3,
    reps: '10-15',
    intensity: 'Body weight',
    progression: 'Add ankle weights',
    equipment: ['Ankle weights (optional)']
  },
  {
    id: 'knee3',
    name: 'Mini Squats',
    category: 'functional',
    sets: 3,
    reps: '10-15',
    intensity: 'Body weight',
    progression: 'Increase depth, add resistance',
    equipment: []
  },
  {
    id: 'knee4',
    name: 'Step-Ups',
    category: 'functional',
    sets: 3,
    reps: '10-12 each leg',
    intensity: 'Body weight',
    progression: 'Increase step height',
    equipment: ['Step or stairs']
  },
  {
    id: 'knee5',
    name: 'Terminal Knee Extension',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Resistance band',
    equipment: ['Resistance band']
  },
  
  // Hip Exercises
  {
    id: 'hip1',
    name: 'Clamshells',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Body weight to band',
    progression: 'Add resistance band',
    equipment: ['Resistance band (optional)']
  },
  {
    id: 'hip2',
    name: 'Hip Abduction Side-Lying',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Body weight',
    progression: 'Add ankle weights',
    equipment: ['Ankle weights (optional)']
  },
  {
    id: 'hip3',
    name: 'Glute Bridges',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Body weight',
    progression: 'Single leg, add band',
    equipment: ['Resistance band (optional)']
  },
  {
    id: 'hip4',
    name: 'Hip Flexor Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Moderate stretch',
    equipment: []
  },
  
  // Core/Back Exercises
  {
    id: 'core1',
    name: 'Transverse Abdominis Activation',
    category: 'strengthening',
    sets: 3,
    reps: '10-15',
    hold: 5,
    intensity: 'Gentle activation',
    equipment: []
  },
  {
    id: 'core2',
    name: 'Bird Dog',
    category: 'strengthening',
    sets: 3,
    reps: '10 each side',
    hold: 5,
    intensity: 'Body weight',
    equipment: ['Yoga mat']
  },
  {
    id: 'core3',
    name: 'Dead Bug',
    category: 'strengthening',
    sets: 3,
    reps: '10 each side',
    intensity: 'Body weight',
    equipment: ['Yoga mat']
  },
  {
    id: 'core4',
    name: 'Cat-Cow Mobility',
    category: 'mobility',
    sets: 3,
    reps: '10-12',
    intensity: 'Controlled movement',
    equipment: ['Yoga mat']
  },
  {
    id: 'core5',
    name: 'Prone Press-Ups (McKenzie)',
    category: 'mobility',
    sets: 3,
    reps: '10-15',
    intensity: 'Body weight',
    equipment: []
  },
  
  // Ankle/Foot Exercises
  {
    id: 'ankle1',
    name: 'Ankle Pumps',
    category: 'mobility',
    sets: 3,
    reps: '20-30',
    intensity: 'Active movement',
    equipment: []
  },
  {
    id: 'ankle2',
    name: 'Calf Raises',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Body weight',
    progression: 'Single leg, add weight',
    equipment: []
  },
  {
    id: 'ankle3',
    name: 'Towel Calf Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Moderate stretch',
    equipment: ['Towel']
  },
  
  // Balance/Proprioception
  {
    id: 'balance1',
    name: 'Single Leg Stance',
    category: 'neuromuscular',
    sets: 3,
    hold: 30,
    progression: 'Eyes closed, unstable surface',
    equipment: ['Balance pad (optional)']
  },
  {
    id: 'balance2',
    name: 'Tandem Walking',
    category: 'neuromuscular',
    sets: 3,
    reps: '10 steps',
    intensity: 'Controlled',
    equipment: []
  },
  
  // Cardiovascular
  {
    id: 'cardio1',
    name: 'Walking Program',
    category: 'cardio',
    duration: 20,
    intensity: 'Light to moderate',
    progression: 'Increase duration/speed',
    equipment: []
  },
  {
    id: 'cardio2',
    name: 'Stationary Cycling',
    category: 'cardio',
    duration: 20,
    intensity: 'Moderate (60-70% HR max)',
    equipment: ['Stationary bike']
  },
  {
    id: 'cardio3',
    name: 'Aqua Therapy/Pool Walking',
    category: 'cardio',
    duration: 30,
    intensity: 'Light to moderate',
    equipment: ['Pool access']
  },

  // Additional Shoulder Exercises
  {
    id: 'shoulder11',
    name: 'Wall Angels',
    category: 'mobility',
    sets: 3,
    reps: '15-20',
    intensity: 'Body weight',
    equipment: ['Wall']
  },
  {
    id: 'shoulder12',
    name: 'Shoulder Flexion with Wand',
    category: 'mobility',
    sets: 3,
    reps: '10-15',
    intensity: 'Assisted',
    equipment: ['Wand or stick']
  },
  {
    id: 'shoulder13',
    name: 'Horizontal Abduction',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Light resistance',
    equipment: ['Resistance band']
  },
  {
    id: 'shoulder14',
    name: 'Shoulder Shrugs',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Body weight to light weights',
    equipment: ['Dumbbells (optional)']
  },
  {
    id: 'shoulder15',
    name: 'Bear Crawl Position Hold',
    category: 'strengthening',
    sets: 3,
    hold: 30,
    intensity: 'Body weight',
    equipment: []
  },
  {
    id: 'shoulder16',
    name: 'Reverse Fly',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Light weights',
    equipment: ['Dumbbells']
  },
  {
    id: 'shoulder17',
    name: 'High Row with Band',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Moderate resistance',
    equipment: ['Resistance band']
  },
  {
    id: 'shoulder18',
    name: 'Low Row with Band',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Moderate resistance',
    equipment: ['Resistance band']
  },
  {
    id: 'shoulder19',
    name: 'Doorway Pec Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Gentle stretch',
    equipment: ['Doorway']
  },
  {
    id: 'shoulder20',
    name: 'Upper Trap Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Gentle stretch',
    equipment: []
  },

  // Elbow/Wrist Exercises
  {
    id: 'elbow1',
    name: 'Wrist Flexor Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Gentle stretch',
    equipment: []
  },
  {
    id: 'elbow2',
    name: 'Wrist Extensor Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Gentle stretch',
    equipment: []
  },
  {
    id: 'elbow3',
    name: 'Wrist Curls',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Light weight',
    equipment: ['Light dumbbell']
  },
  {
    id: 'elbow4',
    name: 'Reverse Wrist Curls',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Light weight',
    equipment: ['Light dumbbell']
  },
  {
    id: 'elbow5',
    name: 'Pronation/Supination',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Light weight',
    equipment: ['Hammer or dumbbell']
  },
  {
    id: 'elbow6',
    name: 'Eccentric Wrist Extension',
    category: 'strengthening',
    sets: 3,
    reps: '10-12',
    intensity: 'Slow controlled',
    equipment: ['Light dumbbell']
  },
  {
    id: 'elbow7',
    name: 'Grip Strengthening',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Progressive',
    equipment: ['Therapy putty or ball']
  },
  {
    id: 'elbow8',
    name: 'Tennis Ball Squeeze',
    category: 'strengthening',
    sets: 3,
    hold: 5,
    reps: '15-20',
    equipment: ['Tennis ball']
  },
  {
    id: 'elbow9',
    name: 'Finger Extension with Band',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Light resistance',
    equipment: ['Rubber band']
  },
  {
    id: 'elbow10',
    name: 'Bicep Curls',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Moderate weight',
    equipment: ['Dumbbells']
  },

  // Neck Exercises
  {
    id: 'neck1',
    name: 'Chin Tucks',
    category: 'strengthening',
    sets: 3,
    hold: 5,
    reps: '10-15',
    intensity: 'Gentle',
    equipment: []
  },
  {
    id: 'neck2',
    name: 'Neck Isometrics',
    category: 'strengthening',
    sets: 3,
    hold: 5,
    reps: '10 each direction',
    intensity: 'Submaximal',
    equipment: []
  },
  {
    id: 'neck3',
    name: 'Upper Cervical Nod',
    category: 'strengthening',
    sets: 3,
    hold: 5,
    reps: '10-15',
    intensity: 'Gentle',
    equipment: []
  },
  {
    id: 'neck4',
    name: 'Neck Rotation Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Gentle',
    equipment: []
  },
  {
    id: 'neck5',
    name: 'Levator Scapulae Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Gentle',
    equipment: []
  },
  {
    id: 'neck6',
    name: 'Scalene Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Gentle',
    equipment: []
  },
  {
    id: 'neck7',
    name: 'SNAGs (Sustained Natural Apophyseal Glides)',
    category: 'mobility',
    sets: 3,
    reps: '10',
    intensity: 'Gentle',
    equipment: ['Towel']
  },
  {
    id: 'neck8',
    name: 'Deep Neck Flexor Strengthening',
    category: 'strengthening',
    sets: 3,
    hold: 10,
    reps: '10',
    intensity: 'Progressive',
    equipment: []
  },

  // Additional Knee Exercises
  {
    id: 'knee6',
    name: 'Wall Sits',
    category: 'strengthening',
    sets: 3,
    hold: 30,
    intensity: 'Body weight',
    progression: 'Increase hold time',
    equipment: ['Wall']
  },
  {
    id: 'knee7',
    name: 'Hamstring Curls',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Resistance band or machine',
    equipment: ['Resistance band']
  },
  {
    id: 'knee8',
    name: 'Leg Press',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Progressive loading',
    equipment: ['Leg press machine']
  },
  {
    id: 'knee9',
    name: 'Single Leg Squat',
    category: 'functional',
    sets: 3,
    reps: '8-10',
    intensity: 'Body weight',
    progression: 'Increase depth',
    equipment: []
  },
  {
    id: 'knee10',
    name: 'Lateral Step-Downs',
    category: 'functional',
    sets: 3,
    reps: '10-12',
    intensity: 'Body weight',
    equipment: ['Step']
  },
  {
    id: 'knee11',
    name: 'Bulgarian Split Squats',
    category: 'strengthening',
    sets: 3,
    reps: '10-12',
    intensity: 'Body weight to weighted',
    equipment: ['Bench', 'Dumbbells (optional)']
  },
  {
    id: 'knee12',
    name: 'Nordic Hamstring Exercise',
    category: 'strengthening',
    sets: 3,
    reps: '6-8',
    intensity: 'Eccentric focus',
    equipment: ['Partner or anchor']
  },
  {
    id: 'knee13',
    name: 'Box Jumps',
    category: 'functional',
    sets: 3,
    reps: '8-10',
    intensity: 'Progressive height',
    equipment: ['Box or platform']
  },
  {
    id: 'knee14',
    name: 'Lunges',
    category: 'functional',
    sets: 3,
    reps: '10-12 each leg',
    intensity: 'Body weight to weighted',
    equipment: ['Dumbbells (optional)']
  },
  {
    id: 'knee15',
    name: 'Reverse Lunges',
    category: 'functional',
    sets: 3,
    reps: '10-12 each leg',
    intensity: 'Body weight to weighted',
    equipment: ['Dumbbells (optional)']
  },

  // Additional Hip Exercises
  {
    id: 'hip5',
    name: 'Fire Hydrants',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Body weight',
    equipment: []
  },
  {
    id: 'hip6',
    name: 'Monster Walks',
    category: 'strengthening',
    sets: 3,
    reps: '15 steps each direction',
    intensity: 'Resistance band',
    equipment: ['Resistance band']
  },
  {
    id: 'hip7',
    name: 'Hip Hiking',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Body weight',
    equipment: ['Step']
  },
  {
    id: 'hip8',
    name: 'Pigeon Pose',
    category: 'stretching',
    sets: 3,
    hold: 60,
    intensity: 'Deep stretch',
    equipment: ['Yoga mat']
  },
  {
    id: 'hip9',
    name: '90/90 Hip Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Moderate stretch',
    equipment: []
  },
  {
    id: 'hip10',
    name: 'Hip Circles',
    category: 'mobility',
    sets: 3,
    reps: '10 each direction',
    intensity: 'Controlled movement',
    equipment: []
  },
  {
    id: 'hip11',
    name: 'Single Leg Deadlift',
    category: 'functional',
    sets: 3,
    reps: '10-12',
    intensity: 'Body weight to weighted',
    equipment: ['Dumbbell (optional)']
  },
  {
    id: 'hip12',
    name: 'Lateral Lunges',
    category: 'functional',
    sets: 3,
    reps: '10-12 each side',
    intensity: 'Body weight',
    equipment: []
  },
  {
    id: 'hip13',
    name: 'Hip Thrusts',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Progressive loading',
    equipment: ['Bench', 'Barbell (optional)']
  },
  {
    id: 'hip14',
    name: 'Curtsy Lunges',
    category: 'functional',
    sets: 3,
    reps: '10-12 each side',
    intensity: 'Body weight',
    equipment: []
  },

  // Additional Core/Back Exercises
  {
    id: 'core6',
    name: 'Plank',
    category: 'strengthening',
    sets: 3,
    hold: 30,
    intensity: 'Body weight',
    progression: 'Increase hold time',
    equipment: []
  },
  {
    id: 'core7',
    name: 'Side Plank',
    category: 'strengthening',
    sets: 3,
    hold: 30,
    intensity: 'Body weight',
    equipment: []
  },
  {
    id: 'core8',
    name: 'Pallof Press',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Resistance band',
    equipment: ['Resistance band or cable']
  },
  {
    id: 'core9',
    name: 'Russian Twists',
    category: 'strengthening',
    sets: 3,
    reps: '20-30',
    intensity: 'Body weight to weighted',
    equipment: ['Medicine ball (optional)']
  },
  {
    id: 'core10',
    name: 'Supermans',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    hold: 2,
    intensity: 'Body weight',
    equipment: []
  },
  {
    id: 'core11',
    name: 'McGill Curl-Up',
    category: 'strengthening',
    sets: 3,
    hold: 10,
    reps: '8-10',
    intensity: 'Body weight',
    equipment: []
  },
  {
    id: 'core12',
    name: 'Quadruped Opposite Arm/Leg',
    category: 'strengthening',
    sets: 3,
    hold: 5,
    reps: '10 each side',
    intensity: 'Body weight',
    equipment: []
  },
  {
    id: 'core13',
    name: 'Seated Good Mornings',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Body weight to weighted',
    equipment: ['Barbell (optional)']
  },
  {
    id: 'core14',
    name: 'Prone Cobra',
    category: 'strengthening',
    sets: 3,
    hold: 15,
    reps: '10',
    intensity: 'Body weight',
    equipment: []
  },
  {
    id: 'core15',
    name: 'Child\'s Pose',
    category: 'stretching',
    sets: 3,
    hold: 60,
    intensity: 'Gentle stretch',
    equipment: []
  },

  // Additional Ankle/Foot Exercises
  {
    id: 'ankle4',
    name: 'Heel Walks',
    category: 'strengthening',
    sets: 3,
    reps: '20 steps',
    intensity: 'Body weight',
    equipment: []
  },
  {
    id: 'ankle5',
    name: 'Toe Walks',
    category: 'strengthening',
    sets: 3,
    reps: '20 steps',
    intensity: 'Body weight',
    equipment: []
  },
  {
    id: 'ankle6',
    name: 'Ankle Circles',
    category: 'mobility',
    sets: 3,
    reps: '10 each direction',
    intensity: 'Active movement',
    equipment: []
  },
  {
    id: 'ankle7',
    name: 'Towel Scrunches',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Active',
    equipment: ['Towel']
  },
  {
    id: 'ankle8',
    name: 'Marble Pickups',
    category: 'strengthening',
    sets: 3,
    reps: '20',
    intensity: 'Fine motor control',
    equipment: ['Marbles', 'Container']
  },
  {
    id: 'ankle9',
    name: 'Ankle Eversion with Band',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Resistance band',
    equipment: ['Resistance band']
  },
  {
    id: 'ankle10',
    name: 'Ankle Inversion with Band',
    category: 'strengthening',
    sets: 3,
    reps: '15-20',
    intensity: 'Resistance band',
    equipment: ['Resistance band']
  },
  {
    id: 'ankle11',
    name: 'Single Leg Heel Raises',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Body weight',
    progression: 'Add weight',
    equipment: []
  },
  {
    id: 'ankle12',
    name: 'Eccentric Heel Drops',
    category: 'strengthening',
    sets: 3,
    reps: '12-15',
    intensity: 'Slow controlled',
    equipment: ['Step']
  },
  {
    id: 'ankle13',
    name: 'Soleus Stretch',
    category: 'stretching',
    sets: 3,
    hold: 30,
    intensity: 'Moderate stretch',
    equipment: ['Wall']
  },

  // Balance and Proprioception
  {
    id: 'balance3',
    name: 'BOSU Ball Squats',
    category: 'neuromuscular',
    sets: 3,
    reps: '12-15',
    intensity: 'Unstable surface',
    equipment: ['BOSU ball']
  },
  {
    id: 'balance4',
    name: 'Single Leg Romanian Deadlift',
    category: 'neuromuscular',
    sets: 3,
    reps: '10-12',
    intensity: 'Body weight to weighted',
    equipment: ['Dumbbell (optional)']
  },
  {
    id: 'balance5',
    name: 'Star Excursion',
    category: 'neuromuscular',
    sets: 3,
    reps: '8 reaches',
    intensity: 'Controlled reach',
    equipment: []
  },
  {
    id: 'balance6',
    name: 'Wobble Board Balance',
    category: 'neuromuscular',
    sets: 3,
    hold: 30,
    intensity: 'Progressive difficulty',
    equipment: ['Wobble board']
  },
  {
    id: 'balance7',
    name: 'Foam Pad Marching',
    category: 'neuromuscular',
    sets: 3,
    reps: '20 steps',
    intensity: 'Controlled',
    equipment: ['Foam pad']
  },
  {
    id: 'balance8',
    name: 'Clock Reaches',
    category: 'neuromuscular',
    sets: 3,
    reps: '12 positions',
    intensity: 'Controlled reach',
    equipment: []
  },
  {
    id: 'balance9',
    name: 'Lateral Hops',
    category: 'neuromuscular',
    sets: 3,
    reps: '10-15 each side',
    intensity: 'Progressive speed',
    equipment: []
  },
  {
    id: 'balance10',
    name: 'Figure-8 Walking',
    category: 'neuromuscular',
    sets: 3,
    reps: '5 patterns',
    intensity: 'Controlled',
    equipment: ['Cones']
  },

  // Sport-Specific/Functional
  {
    id: 'sport1',
    name: 'Agility Ladder Drills',
    category: 'functional',
    sets: 3,
    reps: '30 seconds',
    intensity: 'High speed',
    equipment: ['Agility ladder']
  },
  {
    id: 'sport2',
    name: 'Medicine Ball Slams',
    category: 'functional',
    sets: 3,
    reps: '10-12',
    intensity: 'Explosive',
    equipment: ['Medicine ball']
  },
  {
    id: 'sport3',
    name: 'Burpees',
    category: 'functional',
    sets: 3,
    reps: '10-15',
    intensity: 'High intensity',
    equipment: []
  },
  {
    id: 'sport4',
    name: 'Mountain Climbers',
    category: 'functional',
    sets: 3,
    reps: '20-30',
    intensity: 'Moderate to high',
    equipment: []
  },
  {
    id: 'sport5',
    name: 'Plyometric Push-Ups',
    category: 'functional',
    sets: 3,
    reps: '8-10',
    intensity: 'Explosive',
    equipment: []
  },
  {
    id: 'sport6',
    name: 'Skater Hops',
    category: 'functional',
    sets: 3,
    reps: '10-15 each side',
    intensity: 'Dynamic',
    equipment: []
  },
  {
    id: 'sport7',
    name: 'Shuttle Runs',
    category: 'functional',
    sets: 5,
    reps: '20 yards',
    intensity: 'Sprint speed',
    equipment: ['Cones']
  },
  {
    id: 'sport8',
    name: 'Kettlebell Swings',
    category: 'functional',
    sets: 3,
    reps: '15-20',
    intensity: 'Explosive hip drive',
    equipment: ['Kettlebell']
  },
  {
    id: 'sport9',
    name: 'Battle Ropes',
    category: 'functional',
    sets: 3,
    duration: 30,
    intensity: 'High intensity',
    equipment: ['Battle ropes']
  },
  {
    id: 'sport10',
    name: 'Farmer\'s Walk',
    category: 'functional',
    sets: 3,
    reps: '40 yards',
    intensity: 'Heavy load',
    equipment: ['Dumbbells or kettlebells']
  },

  // Additional Cardio Options
  {
    id: 'cardio4',
    name: 'Elliptical Training',
    category: 'cardio',
    duration: 20,
    intensity: 'Moderate',
    equipment: ['Elliptical machine']
  },
  {
    id: 'cardio5',
    name: 'Rowing Machine',
    category: 'cardio',
    duration: 15,
    intensity: 'Moderate to high',
    equipment: ['Rowing machine']
  },
  {
    id: 'cardio6',
    name: 'Stair Climbing',
    category: 'cardio',
    duration: 15,
    intensity: 'Moderate',
    equipment: ['Stairs or stair climber']
  },
  {
    id: 'cardio7',
    name: 'Interval Training',
    category: 'cardio',
    sets: 8,
    duration: 30,
    intensity: 'High/Low alternating',
    equipment: []
  },
  {
    id: 'cardio8',
    name: 'Swimming',
    category: 'cardio',
    duration: 30,
    intensity: 'Low impact',
    equipment: ['Pool']
  },

  // Specialized Therapeutic Exercises
  {
    id: 'special1',
    name: 'Diaphragmatic Breathing',
    category: 'mobility',
    sets: 3,
    reps: '10 breaths',
    intensity: 'Relaxed',
    equipment: []
  },
  {
    id: 'special2',
    name: 'Foam Rolling - IT Band',
    category: 'mobility',
    sets: 3,
    duration: 60,
    intensity: 'Moderate pressure',
    equipment: ['Foam roller']
  },
  {
    id: 'special3',
    name: 'Foam Rolling - Quadriceps',
    category: 'mobility',
    sets: 3,
    duration: 60,
    intensity: 'Moderate pressure',
    equipment: ['Foam roller']
  },
  {
    id: 'special4',
    name: 'Foam Rolling - Calves',
    category: 'mobility',
    sets: 3,
    duration: 60,
    intensity: 'Moderate pressure',
    equipment: ['Foam roller']
  },
  {
    id: 'special5',
    name: 'Neural Glides - Median Nerve',
    category: 'mobility',
    sets: 3,
    reps: '10-15',
    intensity: 'Gentle',
    equipment: []
  },
  {
    id: 'special6',
    name: 'Neural Glides - Sciatic',
    category: 'mobility',
    sets: 3,
    reps: '10-15',
    intensity: 'Gentle',
    equipment: []
  },
  {
    id: 'special7',
    name: 'Trigger Point Release',
    category: 'mobility',
    sets: 3,
    hold: 30,
    intensity: 'Moderate pressure',
    equipment: ['Tennis ball or trigger point tool']
  },
  {
    id: 'special8',
    name: 'Joint Mobilization with Movement',
    category: 'mobility',
    sets: 3,
    reps: '10',
    intensity: 'Therapist guided',
    equipment: ['Belt or strap']
  }
];

export default function TreatmentPlanningAssistant({ 
  onGeneratePlan,
  onExportPlan,
  patientInfo 
}: TreatmentPlanningAssistantProps) {
  const { toast } = useToast();
  const [diagnosis, setDiagnosis] = useState(patientInfo?.diagnosis || '');
  const [sessionFrequency, setSessionFrequency] = useState('2x/week');
  const [planDuration, setPlanDuration] = useState('8 weeks');
  const [phases, setPhases] = useState<TreatmentPhase[]>([
    {
      id: 'phase1',
      name: 'Acute/Protection Phase',
      duration: '0-2 weeks',
      goals: ['Reduce pain and inflammation', 'Protect healing tissues', 'Maintain ROM'],
      exercises: [],
      manualTherapy: [],
      modalities: [],
      precautions: [],
      progressionCriteria: []
    }
  ]);
  const [selectedPhase, setSelectedPhase] = useState('phase1');
  const [homeProgram, setHomeProgram] = useState<Exercise[]>([]);
  const [outcomes, setOutcomes] = useState<string[]>([
    'Reduce pain to 2/10 or less',
    'Return to full activities',
    'Independent with home program'
  ]);

  const addPhase = () => {
    const newPhase: TreatmentPhase = {
      id: `phase${phases.length + 1}`,
      name: `Phase ${phases.length + 1}`,
      duration: '',
      goals: [],
      exercises: [],
      manualTherapy: [],
      modalities: [],
      precautions: [],
      progressionCriteria: []
    };
    setPhases([...phases, newPhase]);
    setSelectedPhase(newPhase.id);
  };

  const updatePhase = (phaseId: string, updates: Partial<TreatmentPhase>) => {
    setPhases(phases.map(p => p.id === phaseId ? { ...p, ...updates } : p));
  };

  const deletePhase = (phaseId: string) => {
    if (phases.length > 1) {
      setPhases(phases.filter(p => p.id !== phaseId));
      if (selectedPhase === phaseId) {
        setSelectedPhase(phases[0].id);
      }
    }
  };

  const addExerciseToPhase = (phaseId: string, exercise: Exercise) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase && !phase.exercises.find(e => e.id === exercise.id)) {
      updatePhase(phaseId, {
        exercises: [...phase.exercises, exercise]
      });
    }
  };

  const removeExerciseFromPhase = (phaseId: string, exerciseId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase) {
      updatePhase(phaseId, {
        exercises: phase.exercises.filter(e => e.id !== exerciseId)
      });
    }
  };

  const addToHomeProgram = (exercise: Exercise) => {
    if (!homeProgram.find(e => e.id === exercise.id)) {
      setHomeProgram([...homeProgram, exercise]);
    }
  };

  const removeFromHomeProgram = (exerciseId: string) => {
    setHomeProgram(homeProgram.filter(e => e.id !== exerciseId));
  };

  const generateAIPlan = () => {
    // In production, this would call an AI service
    toast({
      title: "AI Plan Generation",
      description: "Generating evidence-based treatment plan...",
    });
    
    // Simulate AI generation - intelligently select exercises based on diagnosis
    setTimeout(() => {
      const diagnosisLower = diagnosis.toLowerCase();
      let selectedExercises: { phase1: Exercise[], phase2: Exercise[], phase3: Exercise[] } = {
        phase1: [],
        phase2: [],
        phase3: []
      };
      
      // Select exercises based on diagnosis keywords
      if (diagnosisLower.includes('rotator') || diagnosisLower.includes('shoulder') || diagnosisLower.includes('impingement')) {
        // Shoulder/Rotator Cuff protocol
        selectedExercises.phase1 = [
          exerciseDatabase.find(e => e.id === 'shoulder1')!, // Pendulum
          exerciseDatabase.find(e => e.id === 'shoulder2')!, // Isometric ER
          exerciseDatabase.find(e => e.id === 'shoulder8')!, // Sleeper stretch
        ].filter(Boolean);
        
        selectedExercises.phase2 = [
          exerciseDatabase.find(e => e.id === 'shoulder3')!, // Scapular wall slides
          exerciseDatabase.find(e => e.id === 'shoulder4')!, // ER with band
          exerciseDatabase.find(e => e.id === 'shoulder5')!, // IR with band
          exerciseDatabase.find(e => e.id === 'shoulder9')!, // Cross-body stretch
        ].filter(Boolean);
        
        selectedExercises.phase3 = [
          exerciseDatabase.find(e => e.id === 'shoulder6')!, // Prone T's
          exerciseDatabase.find(e => e.id === 'shoulder7')!, // Prone Y's
          exerciseDatabase.find(e => e.id === 'shoulder10')!, // Serratus punch
          exerciseDatabase.find(e => e.id === 'shoulder4')!, // ER with band (progressive)
        ].filter(Boolean);
        
      } else if (diagnosisLower.includes('knee') || diagnosisLower.includes('acl') || diagnosisLower.includes('patello')) {
        // Knee protocol
        selectedExercises.phase1 = [
          exerciseDatabase.find(e => e.id === 'knee1')!, // Quad sets
          exerciseDatabase.find(e => e.id === 'knee2')!, // SLR
          exerciseDatabase.find(e => e.id === 'ankle1')!, // Ankle pumps
        ].filter(Boolean);
        
        selectedExercises.phase2 = [
          exerciseDatabase.find(e => e.id === 'knee3')!, // Mini squats
          exerciseDatabase.find(e => e.id === 'knee5')!, // Terminal knee extension
          exerciseDatabase.find(e => e.id === 'hip1')!, // Clamshells
          exerciseDatabase.find(e => e.id === 'balance1')!, // Single leg stance
        ].filter(Boolean);
        
        selectedExercises.phase3 = [
          exerciseDatabase.find(e => e.id === 'knee4')!, // Step-ups
          exerciseDatabase.find(e => e.id === 'hip3')!, // Glute bridges
          exerciseDatabase.find(e => e.id === 'balance2')!, // Tandem walking
          exerciseDatabase.find(e => e.id === 'cardio1')!, // Walking program
        ].filter(Boolean);
        
      } else if (diagnosisLower.includes('back') || diagnosisLower.includes('lumbar') || diagnosisLower.includes('disc')) {
        // Back/Core protocol
        selectedExercises.phase1 = [
          exerciseDatabase.find(e => e.id === 'core1')!, // TA activation
          exerciseDatabase.find(e => e.id === 'core4')!, // Cat-cow
          exerciseDatabase.find(e => e.id === 'core5')!, // Prone press-ups
        ].filter(Boolean);
        
        selectedExercises.phase2 = [
          exerciseDatabase.find(e => e.id === 'core2')!, // Bird dog
          exerciseDatabase.find(e => e.id === 'core3')!, // Dead bug
          exerciseDatabase.find(e => e.id === 'hip3')!, // Glute bridges
          exerciseDatabase.find(e => e.id === 'hip4')!, // Hip flexor stretch
        ].filter(Boolean);
        
        selectedExercises.phase3 = [
          exerciseDatabase.find(e => e.id === 'knee3')!, // Mini squats
          exerciseDatabase.find(e => e.id === 'balance1')!, // Single leg stance
          exerciseDatabase.find(e => e.id === 'cardio1')!, // Walking program
          exerciseDatabase.find(e => e.id === 'core2')!, // Bird dog (progressive)
        ].filter(Boolean);
        
      } else if (diagnosisLower.includes('ankle') || diagnosisLower.includes('achilles') || diagnosisLower.includes('plantar')) {
        // Ankle/Foot protocol
        selectedExercises.phase1 = [
          exerciseDatabase.find(e => e.id === 'ankle1')!, // Ankle pumps
          exerciseDatabase.find(e => e.id === 'ankle3')!, // Towel calf stretch
          exerciseDatabase.find(e => e.id === 'ankle6')!, // Ankle circles
        ].filter(Boolean);
        
        selectedExercises.phase2 = [
          exerciseDatabase.find(e => e.id === 'ankle2')!, // Calf raises
          exerciseDatabase.find(e => e.id === 'ankle9')!, // Ankle eversion
          exerciseDatabase.find(e => e.id === 'ankle10')!, // Ankle inversion
          exerciseDatabase.find(e => e.id === 'balance1')!, // Single leg stance
        ].filter(Boolean);
        
        selectedExercises.phase3 = [
          exerciseDatabase.find(e => e.id === 'ankle11')!, // Single leg heel raises
          exerciseDatabase.find(e => e.id === 'ankle12')!, // Eccentric heel drops
          exerciseDatabase.find(e => e.id === 'balance2')!, // Tandem walking
          exerciseDatabase.find(e => e.id === 'cardio1')!, // Walking program
        ].filter(Boolean);
        
      } else if (diagnosisLower.includes('elbow') || diagnosisLower.includes('tennis') || diagnosisLower.includes('golfer')) {
        // Elbow protocol
        selectedExercises.phase1 = [
          exerciseDatabase.find(e => e.id === 'elbow1')!, // Wrist flexor stretch
          exerciseDatabase.find(e => e.id === 'elbow2')!, // Wrist extensor stretch
          exerciseDatabase.find(e => e.id === 'elbow7')!, // Grip strengthening
        ].filter(Boolean);
        
        selectedExercises.phase2 = [
          exerciseDatabase.find(e => e.id === 'elbow3')!, // Wrist curls
          exerciseDatabase.find(e => e.id === 'elbow4')!, // Reverse wrist curls
          exerciseDatabase.find(e => e.id === 'elbow5')!, // Pronation/supination
          exerciseDatabase.find(e => e.id === 'elbow8')!, // Tennis ball squeeze
        ].filter(Boolean);
        
        selectedExercises.phase3 = [
          exerciseDatabase.find(e => e.id === 'elbow6')!, // Eccentric wrist extension
          exerciseDatabase.find(e => e.id === 'elbow10')!, // Bicep curls
          exerciseDatabase.find(e => e.id === 'shoulder4')!, // External rotation
        ].filter(Boolean);
        
      } else if (diagnosisLower.includes('neck') || diagnosisLower.includes('cervical') || diagnosisLower.includes('whiplash')) {
        // Neck protocol
        selectedExercises.phase1 = [
          exerciseDatabase.find(e => e.id === 'neck1')!, // Chin tucks
          exerciseDatabase.find(e => e.id === 'neck4')!, // Neck rotation stretch
          exerciseDatabase.find(e => e.id === 'neck5')!, // Levator scapulae stretch
        ].filter(Boolean);
        
        selectedExercises.phase2 = [
          exerciseDatabase.find(e => e.id === 'neck2')!, // Neck isometrics
          exerciseDatabase.find(e => e.id === 'neck3')!, // Upper cervical nod
          exerciseDatabase.find(e => e.id === 'neck6')!, // Scalene stretch
          exerciseDatabase.find(e => e.id === 'shoulder3')!, // Scapular wall slides
        ].filter(Boolean);
        
        selectedExercises.phase3 = [
          exerciseDatabase.find(e => e.id === 'neck8')!, // Deep neck flexor strengthening
          exerciseDatabase.find(e => e.id === 'shoulder6')!, // Prone T's
          exerciseDatabase.find(e => e.id === 'core2')!, // Bird dog
        ].filter(Boolean);
        
      } else if (diagnosisLower.includes('hip') || diagnosisLower.includes('glut') || diagnosisLower.includes('piriformis')) {
        // Hip protocol
        selectedExercises.phase1 = [
          exerciseDatabase.find(e => e.id === 'hip4')!, // Hip flexor stretch
          exerciseDatabase.find(e => e.id === 'hip8')!, // Pigeon pose
          exerciseDatabase.find(e => e.id === 'hip10')!, // Hip circles
        ].filter(Boolean);
        
        selectedExercises.phase2 = [
          exerciseDatabase.find(e => e.id === 'hip1')!, // Clamshells
          exerciseDatabase.find(e => e.id === 'hip2')!, // Hip abduction
          exerciseDatabase.find(e => e.id === 'hip3')!, // Glute bridges
          exerciseDatabase.find(e => e.id === 'hip5')!, // Fire hydrants
        ].filter(Boolean);
        
        selectedExercises.phase3 = [
          exerciseDatabase.find(e => e.id === 'hip6')!, // Monster walks
          exerciseDatabase.find(e => e.id === 'hip11')!, // Single leg deadlift
          exerciseDatabase.find(e => e.id === 'hip12')!, // Lateral lunges
          exerciseDatabase.find(e => e.id === 'hip13')!, // Hip thrusts
        ].filter(Boolean);
        
      } else {
        // General protocol for unspecified conditions
        selectedExercises.phase1 = [
          exerciseDatabase.find(e => e.id === 'core1')!,
          exerciseDatabase.find(e => e.id === 'ankle1')!,
        ].filter(Boolean);
        
        selectedExercises.phase2 = [
          exerciseDatabase.find(e => e.id === 'core2')!,
          exerciseDatabase.find(e => e.id === 'hip3')!,
          exerciseDatabase.find(e => e.id === 'balance1')!,
        ].filter(Boolean);
        
        selectedExercises.phase3 = [
          exerciseDatabase.find(e => e.id === 'cardio1')!,
          exerciseDatabase.find(e => e.id === 'balance2')!,
        ].filter(Boolean);
      }
      
      const aiGeneratedPhases: TreatmentPhase[] = [
        {
          id: 'ai-phase1',
          name: 'Protection & Pain Management',
          duration: '0-2 weeks',
          goals: [
            'Reduce pain to 4/10',
            'Protect healing tissues',
            'Maintain available ROM',
            'Patient education on condition'
          ],
          exercises: selectedExercises.phase1,
          manualTherapy: ['Gentle mobilizations Grade I-II', 'Soft tissue techniques'],
          modalities: ['Ice for pain/inflammation', 'TENS as needed'],
          precautions: ['Avoid provocative positions', 'Respect pain response'],
          progressionCriteria: ['Pain <4/10', 'Minimal inflammation', 'Good exercise tolerance']
        },
        {
          id: 'ai-phase2',
          name: 'Mobility & Early Strengthening',
          duration: '2-4 weeks',
          goals: [
            'Restore functional ROM',
            'Begin progressive strengthening',
            'Improve movement quality',
            'Enhance proprioception'
          ],
          exercises: selectedExercises.phase2,
          manualTherapy: ['Joint mobilizations Grade III-IV', 'Muscle energy techniques', 'Neural mobilization as needed'],
          modalities: ['Heat before exercise', 'Ice after as needed'],
          precautions: ['Progress gradually', 'Monitor for flare-ups'],
          progressionCriteria: ['Near full ROM', 'Good strength gains', 'Improved function']
        },
        {
          id: 'ai-phase3',
          name: 'Advanced Strengthening & Return to Function',
          duration: '4-8 weeks',
          goals: [
            'Return to full function',
            'Sport/work-specific training',
            'Injury prevention education',
            'Independent with maintenance program'
          ],
          exercises: selectedExercises.phase3,
          manualTherapy: ['As needed for restrictions'],
          modalities: ['As needed'],
          precautions: ['Avoid overtraining', 'Gradual return to activity'],
          progressionCriteria: ['Meet functional goals', 'Pass return-to-activity tests', 'Confident with self-management']
        }
      ];
      
      setPhases(aiGeneratedPhases);
      
      // Also add appropriate exercises to home program
      const homeExercises = [
        ...selectedExercises.phase1.slice(0, 2),
        ...selectedExercises.phase2.slice(0, 2)
      ];
      setHomeProgram(homeExercises);
      
      toast({
        title: "Plan Generated",
        description: `Evidence-based treatment plan created for ${diagnosis}`,
      });
    }, 2000);
  };

  const exportPlan = () => {
    const plan: TreatmentPlan = {
      diagnosis,
      duration: planDuration,
      frequency: sessionFrequency,
      phases,
      homeProgram,
      outcomes,
      reassessmentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    if (onExportPlan) {
      onExportPlan(plan);
    }
    
    // Create and download text file
    const planText = formatPlanAsText(plan);
    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treatment-plan-${diagnosis.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Plan Exported",
      description: "Treatment plan has been downloaded",
    });
  };

  const formatPlanAsText = (plan: TreatmentPlan): string => {
    let text = `TREATMENT PLAN\n`;
    text += `==============\n\n`;
    text += `Diagnosis: ${plan.diagnosis}\n`;
    text += `Duration: ${plan.duration}\n`;
    text += `Frequency: ${plan.frequency}\n`;
    text += `Reassessment: ${plan.reassessmentDate}\n\n`;
    
    text += `TREATMENT PHASES\n`;
    text += `----------------\n`;
    plan.phases.forEach((phase, idx) => {
      text += `\n${idx + 1}. ${phase.name} (${phase.duration})\n`;
      text += `   Goals:\n`;
      phase.goals.forEach(goal => text += `   - ${goal}\n`);
      
      if (phase.exercises.length > 0) {
        text += `   Exercises:\n`;
        phase.exercises.forEach(ex => {
          text += `   - ${ex.name}`;
          if (ex.sets && ex.reps) text += ` (${ex.sets} x ${ex.reps})`;
          if (ex.hold) text += ` Hold: ${ex.hold}s`;
          text += `\n`;
        });
      }
      
      if (phase.progressionCriteria && phase.progressionCriteria.length > 0) {
        text += `   Progression Criteria:\n`;
        phase.progressionCriteria.forEach(criteria => text += `   - ${criteria}\n`);
      }
    });
    
    text += `\nHOME EXERCISE PROGRAM\n`;
    text += `---------------------\n`;
    plan.homeProgram.forEach(ex => {
      text += `- ${ex.name}`;
      if (ex.sets && ex.reps) text += ` (${ex.sets} x ${ex.reps})`;
      if (ex.frequency) text += ` ${ex.frequency}`;
      text += `\n`;
    });
    
    text += `\nEXPECTED OUTCOMES\n`;
    text += `-----------------\n`;
    plan.outcomes.forEach(outcome => text += `- ${outcome}\n`);
    
    return text;
  };

  const currentPhase = phases.find(p => p.id === selectedPhase);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Treatment Planning Assistant
          </div>
          <Button 
            size="sm" 
            onClick={generateAIPlan}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Zap className="h-4 w-4 mr-1" />
            AI Generate
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs defaultValue="phases" className="h-full">
          <TabsList className="w-full rounded-none">
            <TabsTrigger value="phases" className="flex-1">
              <Activity className="h-3 w-3 mr-1" />
              Phases
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex-1">
              <Dumbbell className="h-3 w-3 mr-1" />
              Exercises
            </TabsTrigger>
            <TabsTrigger value="home" className="flex-1">
              <Home className="h-3 w-3 mr-1" />
              Home Program
            </TabsTrigger>
            <TabsTrigger value="outcomes" className="flex-1">
              <BarChart3 className="h-3 w-3 mr-1" />
              Outcomes
            </TabsTrigger>
          </TabsList>
          
          {/* Phases Tab */}
          <TabsContent value="phases" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {/* Basic Plan Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Diagnosis/Condition</Label>
                    <Input
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g., Rotator cuff tendinopathy"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Session Frequency</Label>
                    <Select value={sessionFrequency} onValueChange={setSessionFrequency}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1x/week">1x/week</SelectItem>
                        <SelectItem value="2x/week">2x/week</SelectItem>
                        <SelectItem value="3x/week">3x/week</SelectItem>
                        <SelectItem value="Daily">Daily HEP only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Phase Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Treatment Phases</Label>
                    <Button size="sm" variant="outline" onClick={addPhase}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Phase
                    </Button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {phases.map((phase, idx) => (
                      <Button
                        key={phase.id}
                        size="sm"
                        variant={selectedPhase === phase.id ? "default" : "outline"}
                        onClick={() => setSelectedPhase(phase.id)}
                        className="flex-shrink-0"
                      >
                        Phase {idx + 1}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Current Phase Details */}
                {currentPhase && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Input
                            value={currentPhase.name}
                            onChange={(e) => updatePhase(currentPhase.id, { name: e.target.value })}
                            className="font-semibold"
                          />
                          {phases.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deletePhase(currentPhase.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div>
                          <Label className="text-xs">Duration</Label>
                          <Input
                            value={currentPhase.duration}
                            onChange={(e) => updatePhase(currentPhase.id, { duration: e.target.value })}
                            placeholder="e.g., 0-2 weeks"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Goals</Label>
                          <Textarea
                            value={currentPhase.goals.join('\n')}
                            onChange={(e) => updatePhase(currentPhase.id, { 
                              goals: e.target.value.split('\n').filter(g => g.trim()) 
                            })}
                            placeholder="One goal per line"
                            className="mt-1 min-h-[80px]"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Progression Criteria</Label>
                          <Textarea
                            value={currentPhase.progressionCriteria?.join('\n') || ''}
                            onChange={(e) => updatePhase(currentPhase.id, { 
                              progressionCriteria: e.target.value.split('\n').filter(c => c.trim()) 
                            })}
                            placeholder="Criteria to advance to next phase"
                            className="mt-1 min-h-[60px]"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Exercises in this Phase</Label>
                          <div className="mt-2 space-y-2">
                            {currentPhase.exercises.map((exercise) => (
                              <div key={exercise.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                <span className="text-sm">{exercise.name}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeExerciseFromPhase(currentPhase.id, exercise.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Exercises Tab */}
          <TabsContent value="exercises" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                <div className="text-center mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <p className="text-lg font-semibold text-gray-800">
                    {exerciseDatabase.length} Evidence-Based Exercises Available
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Covering all major body regions and treatment categories
                  </p>
                </div>
                {exerciseDatabase.map((exercise) => (
                  <Card key={exercise.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-sm">{exercise.name}</h4>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {exercise.category}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => currentPhase && addExerciseToPhase(currentPhase.id, exercise)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Phase
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToHomeProgram(exercise)}
                          >
                            <Home className="h-3 w-3 mr-1" />
                            HEP
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        {exercise.sets && exercise.reps && (
                          <p>Sets/Reps: {exercise.sets} x {exercise.reps}</p>
                        )}
                        {exercise.hold && (
                          <p>Hold: {exercise.hold} seconds</p>
                        )}
                        {exercise.intensity && (
                          <p>Intensity: {exercise.intensity}</p>
                        )}
                        {exercise.progression && (
                          <p>Progression: {exercise.progression}</p>
                        )}
                        {exercise.equipment && exercise.equipment.length > 0 && (
                          <p>Equipment: {exercise.equipment.join(', ')}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Home Program Tab */}
          <TabsContent value="home" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {homeProgram.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No exercises in home program yet</p>
                    <p className="text-xs mt-1">Add exercises from the Exercises tab</p>
                  </div>
                ) : (
                  homeProgram.map((exercise) => (
                    <Card key={exercise.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">{exercise.name}</h4>
                            <div className="text-xs text-muted-foreground mt-1">
                              {exercise.sets && exercise.reps && (
                                <span>{exercise.sets} x {exercise.reps}</span>
                              )}
                              {exercise.hold && (
                                <span> · Hold {exercise.hold}s</span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromHomeProgram(exercise.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                
                <div className="pt-4">
                  <Label className="text-xs">Frequency Instructions</Label>
                  <Textarea
                    placeholder="e.g., Perform exercises 2x daily, morning and evening"
                    className="mt-1"
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Outcomes Tab */}
          <TabsContent value="outcomes" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Expected Outcomes</Label>
                  <Textarea
                    value={outcomes.join('\n')}
                    onChange={(e) => setOutcomes(e.target.value.split('\n').filter(o => o.trim()))}
                    placeholder="One outcome per line"
                    className="mt-1 min-h-[120px]"
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Plan Duration</Label>
                  <Select value={planDuration} onValueChange={setPlanDuration}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4 weeks">4 weeks</SelectItem>
                      <SelectItem value="6 weeks">6 weeks</SelectItem>
                      <SelectItem value="8 weeks">8 weeks</SelectItem>
                      <SelectItem value="12 weeks">12 weeks</SelectItem>
                      <SelectItem value="16 weeks">16 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Reassessment Date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="pt-4 space-y-2">
                  <Button className="w-full" onClick={exportPlan}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Treatment Plan
                  </Button>
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Patient Handout
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}