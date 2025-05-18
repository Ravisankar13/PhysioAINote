import React, { useState } from 'react';
import { 
  BarChart,
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subWeeks, subMonths } from "date-fns";
import { Calendar as CalendarIcon, Activity, Target } from "lucide-react";

// Define types for our component
interface ProgressMetrics {
  date: string;
  rangeOfMotion: number;
  strength: number;
  functionalAbility: number;
  painLevel: number;
  adherence: number;
  goalProgress: number;
}

interface GoalProgress {
  goal: string;
  description: string;
  targetDate: string;
  progress: number;
  status: 'in-progress' | 'achieved' | 'modified';
}

interface PatientProgressTrackerProps {
  patientId: number;
  bodyPart: string;
  initialData?: ProgressMetrics[];
  initialGoals?: GoalProgress[];
}

// Sample color scheme for different metrics
const colorScheme = {
  rangeOfMotion: "#22c55e",    // Green
  strength: "#3b82f6",         // Blue
  functionalAbility: "#a855f7", // Purple
  painLevel: "#ef4444",        // Red
  adherence: "#eab308",        // Yellow
  goalProgress: "#06b6d4"      // Cyan
};

export default function PatientProgressTracker({ 
  patientId, 
  bodyPart,
  initialData,
  initialGoals
}: PatientProgressTrackerProps) {
  // States for the component
  const [timeRange, setTimeRange] = useState<string>("4weeks");
  const [viewMode, setViewMode] = useState<string>("metrics");
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // We'll use sample data for now - in a real app, this would come from the API
  const [data, setData] = useState<ProgressMetrics[]>(initialData || generateSampleData());
  const [goals, setGoals] = useState<GoalProgress[]>(initialGoals || generateSampleGoals(bodyPart));
  
  // Generate filtered data based on the selected time range
  const getFilteredData = () => {
    const now = new Date();
    let cutoffDate = now;
    
    switch (timeRange) {
      case "2weeks":
        cutoffDate = subWeeks(now, 2);
        break;
      case "4weeks":
        cutoffDate = subWeeks(now, 4);
        break;
      case "3months":
        cutoffDate = subMonths(now, 3);
        break;
      case "6months":
        cutoffDate = subMonths(now, 6);
        break;
      default:
        cutoffDate = subWeeks(now, 4);
    }
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
  };
  
  // Helper function to format metric names for display
  const formatMetricName = (metric: string) => {
    switch (metric) {
      case "rangeOfMotion": return "Range of Motion";
      case "strength": return "Strength";
      case "functionalAbility": return "Functional Ability";
      case "painLevel": return "Pain Level";
      case "adherence": return "Adherence to Program";
      case "goalProgress": return "Goal Progress";
      default: return metric;
    }
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center mt-1">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: entry.color }}></div>
              <span className="mr-2 text-sm">{formatMetricName(entry.name)}:</span>
              <span className="font-medium text-sm">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Get latest data point for the radar chart
  const getLatestData = () => {
    const sortedData = [...data].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return sortedData[0];
  };
  
  // Format radar data
  const getRadarData = () => {
    const latest = getLatestData();
    
    // Convert to format needed for radar chart
    return [
      { subject: "Range of Motion", A: latest.rangeOfMotion, fullMark: 10 },
      { subject: "Strength", A: latest.strength, fullMark: 10 },
      { subject: "Functional Ability", A: latest.functionalAbility, fullMark: 10 },
      { subject: "Pain Level (inverted)", A: 10 - latest.painLevel, fullMark: 10 },
      { subject: "Adherence", A: latest.adherence, fullMark: 10 },
    ];
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-3 md:space-y-0">
          <div>
            <CardTitle>Patient Progress Tracker</CardTitle>
            <CardDescription>
              Track rehabilitation progress and outcomes for {bodyPart}
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Select defaultValue={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2weeks">2 Weeks</SelectItem>
                <SelectItem value="4weeks">4 Weeks</SelectItem>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="metrics" onValueChange={setViewMode} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics" className="flex items-center">
              <Activity className="mr-2 h-4 w-4" />
              Progress Metrics
            </TabsTrigger>
            <TabsTrigger value="overview">
              <Target className="mr-2 h-4 w-4" />
              Current Status
            </TabsTrigger>
            <TabsTrigger value="goals">Goals & Outcomes</TabsTrigger>
          </TabsList>
          
          {/* Progress Metrics Tab */}
          <TabsContent value="metrics" className="pt-4">
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getFilteredData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(new Date(date), "MMM d")}
                  />
                  <YAxis domain={[0, 10]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  <Bar 
                    dataKey="rangeOfMotion" 
                    name="rangeOfMotion"
                    fill={colorScheme.rangeOfMotion} 
                  />
                  <Bar 
                    dataKey="strength" 
                    name="strength"
                    fill={colorScheme.strength} 
                  />
                  <Bar 
                    dataKey="functionalAbility" 
                    name="functionalAbility"
                    fill={colorScheme.functionalAbility} 
                  />
                  <Bar 
                    dataKey="painLevel" 
                    name="painLevel"
                    fill={colorScheme.painLevel} 
                  />
                  <Bar 
                    dataKey="adherence" 
                    name="adherence"
                    fill={colorScheme.adherence} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {/* Current Status Tab */}
          <TabsContent value="overview" className="pt-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2">
                <div className="w-full h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData()}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} />
                      <Radar
                        name="Current Status"
                        dataKey="A"
                        stroke={colorScheme.functionalAbility}
                        fill={colorScheme.functionalAbility}
                        fillOpacity={0.6}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="w-full md:w-1/2">
                <h3 className="text-lg font-medium mb-4">Current Assessment</h3>
                <div className="space-y-4">
                  {Object.entries(getLatestData()).map(([key, value]) => {
                    if (key === 'date') return null;
                    
                    // For pain, lower is better. For others, higher is better.
                    const isPain = key === 'painLevel';
                    const score = Number(value);
                    const level = isPain 
                      ? (score <= 3 ? 'Good' : score <= 6 ? 'Moderate' : 'Poor')
                      : (score >= 7 ? 'Good' : score >= 4 ? 'Moderate' : 'Poor');
                    
                    const variant = level === 'Good' 
                      ? 'default' 
                      : level === 'Moderate' 
                        ? 'secondary' 
                        : 'destructive';
                    
                    return (
                      <div key={key} className="flex justify-between items-center border-b pb-2">
                        <span>{formatMetricName(key)}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{value}/10</span>
                          <Badge variant={variant}>{level}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Goals Tab */}
          <TabsContent value="goals" className="pt-4">
            <div className="space-y-4">
              {goals.map((goal, index) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg">{goal.goal}</h3>
                    <Badge variant={
                      goal.status === 'achieved' ? 'default' : 
                      goal.status === 'in-progress' ? 'secondary' : 
                      'outline'
                    }>{goal.status}</Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{goal.description}</p>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Target Date: {format(new Date(goal.targetDate), "MMM d, yyyy")}</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="h-2.5 rounded-full" 
                      style={{ 
                        width: `${goal.progress}%`, 
                        backgroundColor: goal.status === 'achieved' 
                          ? colorScheme.rangeOfMotion 
                          : colorScheme.goalProgress 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-4 p-4 bg-muted/30 rounded-md">
          <h4 className="text-sm font-semibold mb-2">Understanding Progress Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: colorScheme.rangeOfMotion }}></div>
              <span className="text-sm">Range of Motion (0-10): Higher = Better range</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: colorScheme.strength }}></div>
              <span className="text-sm">Strength (0-10): Higher = Better strength</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: colorScheme.functionalAbility }}></div>
              <span className="text-sm">Functional Ability (0-10): Higher = Better function</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: colorScheme.painLevel }}></div>
              <span className="text-sm">Pain Level (0-10): Higher = More pain</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: colorScheme.adherence }}></div>
              <span className="text-sm">Adherence (0-10): Higher = Better compliance with program</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to generate synthetic data for demo/development purposes
function generateSampleData(): ProgressMetrics[] {
  const data: ProgressMetrics[] = [];
  const now = new Date();
  
  // Create data points representing a rehab progression
  for (let i = 90; i >= 0; i -= 5) {  // Every 5 days for 90 days
    const date = new Date();
    date.setDate(now.getDate() - i);
    
    const daysSinceStart = 90 - i;
    const progressFactor = daysSinceStart / 90;
    
    // Generate realistic progress patterns:
    
    // Range of Motion - tends to improve steadily after initial slow progress
    const rangeOfMotion = Math.max(1, Math.min(10, 3 + (progressFactor * 6) + (Math.random() * 1 - 0.5)));
    
    // Strength - improves more slowly, following ROM improvements
    const strength = Math.max(1, Math.min(10, 2 + (Math.max(0, progressFactor - 0.1) * 6) + (Math.random() * 1 - 0.5)));
    
    // Functional ability - improves as strength and ROM improve
    const functionalAbility = Math.max(1, Math.min(10, 2 + (Math.max(0, progressFactor - 0.2) * 7) + (Math.random() * 1 - 0.5)));
    
    // Pain - starts high, decreases with therapy (with some fluctuations)
    const painLevel = Math.max(1, Math.min(10, 9 - (progressFactor * 7) + (Math.random() * 2 - 1)));
    
    // Adherence - tends to start strong, dip in the middle, then improve
    const adherenceFactor = i > 60 ? 0.8 : i > 30 ? 0.6 : 0.9; // Dips in the middle
    const adherence = Math.max(1, Math.min(10, (adherenceFactor * 10) + (Math.random() * 2 - 1)));
    
    // Goal progress - steady improvement with some plateaus
    const goalProgress = Math.max(1, Math.min(10, (progressFactor * 9) + (Math.random() * 1 - 0.5)));
    
    data.push({
      date: date.toISOString().split('T')[0],
      rangeOfMotion: Number(rangeOfMotion.toFixed(1)),
      strength: Number(strength.toFixed(1)),
      functionalAbility: Number(functionalAbility.toFixed(1)),
      painLevel: Number(painLevel.toFixed(1)),
      adherence: Number(adherence.toFixed(1)),
      goalProgress: Number(goalProgress.toFixed(1)),
    });
  }
  
  return data;
}

// Helper function to generate sample goals based on body part
function generateSampleGoals(bodyPart: string): GoalProgress[] {
  const now = new Date();
  const twoWeeks = new Date();
  twoWeeks.setDate(now.getDate() + 14);
  
  const oneMonth = new Date();
  oneMonth.setDate(now.getDate() + 30);
  
  const threeMonths = new Date();
  threeMonths.setDate(now.getDate() + 90);
  
  let goals: GoalProgress[] = [];
  
  // Common goals for all body parts
  goals.push({
    goal: "Reduce Pain Level",
    description: "Decrease pain from current level to 3/10 or less during daily activities",
    targetDate: oneMonth.toISOString().split('T')[0],
    progress: 65,
    status: 'in-progress'
  });
  
  // Body part specific goals
  switch (bodyPart.toLowerCase()) {
    case 'knee':
      goals = [
        ...goals,
        {
          goal: "Improve Knee Flexion",
          description: "Achieve at least 120 degrees of active knee flexion",
          targetDate: twoWeeks.toISOString().split('T')[0],
          progress: 80,
          status: 'in-progress'
        },
        {
          goal: "Strengthen Quadriceps",
          description: "Build sufficient quad strength to perform a single leg squat to 45 degrees",
          targetDate: oneMonth.toISOString().split('T')[0],
          progress: 55,
          status: 'in-progress'
        },
        {
          goal: "Return to Recreational Activities",
          description: "Regain ability to participate in preferred recreational activities without pain",
          targetDate: threeMonths.toISOString().split('T')[0],
          progress: 30,
          status: 'in-progress'
        }
      ];
      break;
    
    case 'shoulder':
      goals = [
        ...goals,
        {
          goal: "Restore Overhead Reaching",
          description: "Regain full overhead reaching capability without compensation",
          targetDate: oneMonth.toISOString().split('T')[0],
          progress: 60,
          status: 'in-progress'
        },
        {
          goal: "Improve Rotator Cuff Strength",
          description: "Achieve 4+/5 strength in all rotator cuff muscles",
          targetDate: twoWeeks.toISOString().split('T')[0],
          progress: 90,
          status: 'achieved'
        },
        {
          goal: "Return to Work Activities",
          description: "Safely perform all work-related tasks without pain or limitation",
          targetDate: threeMonths.toISOString().split('T')[0],
          progress: 45,
          status: 'in-progress'
        }
      ];
      break;
      
    case 'back':
    case 'spine':
    case 'lower back':
      goals = [
        ...goals,
        {
          goal: "Improve Core Stability",
          description: "Develop sufficient core strength to maintain neutral spine during daily activities",
          targetDate: twoWeeks.toISOString().split('T')[0],
          progress: 75,
          status: 'in-progress'
        },
        {
          goal: "Increase Sitting Tolerance",
          description: "Achieve ability to sit comfortably for up to 45 minutes without pain",
          targetDate: oneMonth.toISOString().split('T')[0],
          progress: 65,
          status: 'in-progress'
        },
        {
          goal: "Implement Self-Management",
          description: "Consistently apply home exercise program and ergonomic modifications",
          targetDate: threeMonths.toISOString().split('T')[0],
          progress: 85,
          status: 'in-progress'
        }
      ];
      break;
      
    case 'ankle':
      goals = [
        ...goals,
        {
          goal: "Restore Normal Gait",
          description: "Walk without limping or altered pattern for 15+ minutes",
          targetDate: twoWeeks.toISOString().split('T')[0],
          progress: 95,
          status: 'achieved'
        },
        {
          goal: "Improve Balance",
          description: "Maintain single leg balance for 30 seconds without support",
          targetDate: oneMonth.toISOString().split('T')[0],
          progress: 70,
          status: 'in-progress'
        },
        {
          goal: "Return to Sports",
          description: "Perform sport-specific movements with full confidence and no pain",
          targetDate: threeMonths.toISOString().split('T')[0],
          progress: 40,
          status: 'in-progress'
        }
      ];
      break;
      
    // Default goals for other body parts
    default:
      goals = [
        ...goals,
        {
          goal: "Improve Functional Movement",
          description: "Restore full functional movement patterns relevant to daily activities",
          targetDate: twoWeeks.toISOString().split('T')[0],
          progress: 80,
          status: 'in-progress'
        },
        {
          goal: "Build Strength & Stability",
          description: "Achieve appropriate strength and stability for the affected area",
          targetDate: oneMonth.toISOString().split('T')[0],
          progress: 65,
          status: 'in-progress'
        },
        {
          goal: "Prevention Strategy",
          description: "Implement long-term prevention strategy for recurrence",
          targetDate: threeMonths.toISOString().split('T')[0],
          progress: 50,
          status: 'in-progress'
        }
      ];
  }
  
  return goals;
}