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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subWeeks, subMonths } from "date-fns";
import { Calendar as CalendarIcon, Activity, Target, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

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
  
  // Start with empty data arrays - user will input their own data
  const [data, setData] = useState<ProgressMetrics[]>(initialData || []);
  const [goals, setGoals] = useState<GoalProgress[]>(initialGoals || []);
  
  // State for the data input form
  const [showDataForm, setShowDataForm] = useState(false);
  const [newDataPoint, setNewDataPoint] = useState<Partial<ProgressMetrics>>({
    date: new Date().toISOString().split('T')[0],
    rangeOfMotion: 5,
    strength: 5,
    functionalAbility: 5,
    painLevel: 5,
    adherence: 5,
    goalProgress: 5
  });
  
  // State for the goal input form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<GoalProgress>>({
    goal: "",
    description: "",
    targetDate: new Date().toISOString().split('T')[0],
    progress: 0,
    status: 'in-progress'
  });
  
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
    if (data.length === 0) {
      return {
        date: new Date().toISOString().split('T')[0],
        rangeOfMotion: 0,
        strength: 0,
        functionalAbility: 0,
        painLevel: 0,
        adherence: 0,
        goalProgress: 0
      };
    }
    
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
  
  // Handle form input changes for new data points
  const handleDataInputChange = (field: keyof ProgressMetrics, value: any) => {
    setNewDataPoint({
      ...newDataPoint,
      [field]: value
    });
  };
  
  // Add a new data point
  const addDataPoint = () => {
    // Ensure we have all required fields
    const completeDataPoint = {
      date: newDataPoint.date || new Date().toISOString().split('T')[0],
      rangeOfMotion: newDataPoint.rangeOfMotion || 0,
      strength: newDataPoint.strength || 0,
      functionalAbility: newDataPoint.functionalAbility || 0,
      painLevel: newDataPoint.painLevel || 0,
      adherence: newDataPoint.adherence || 0,
      goalProgress: newDataPoint.goalProgress || 0
    } as ProgressMetrics;
    
    setData([...data, completeDataPoint]);
    
    // Reset form
    setNewDataPoint({
      date: new Date().toISOString().split('T')[0],
      rangeOfMotion: 5,
      strength: 5,
      functionalAbility: 5,
      painLevel: 5,
      adherence: 5,
      goalProgress: 5
    });
    
    setShowDataForm(false);
  };
  
  // Handle form input changes for new goals
  const handleGoalInputChange = (field: keyof GoalProgress, value: any) => {
    setNewGoal({
      ...newGoal,
      [field]: value
    });
  };
  
  // Add a new goal
  const addGoal = () => {
    if (!newGoal.goal || !newGoal.description) {
      return; // Don't add incomplete goals
    }
    
    const completeGoal = {
      goal: newGoal.goal,
      description: newGoal.description,
      targetDate: newGoal.targetDate || new Date().toISOString().split('T')[0],
      progress: newGoal.progress || 0,
      status: newGoal.status || 'in-progress'
    } as GoalProgress;
    
    setGoals([...goals, completeGoal]);
    
    // Reset form
    setNewGoal({
      goal: "",
      description: "",
      targetDate: new Date().toISOString().split('T')[0],
      progress: 0,
      status: 'in-progress'
    });
    
    setShowGoalForm(false);
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
            {data.length > 0 && (
              <>
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
              </>
            )}
            
            <Button 
              onClick={() => setShowDataForm(!showDataForm)} 
              variant={showDataForm ? "secondary" : "default"}
              className="gap-1"
            >
              {showDataForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showDataForm ? "Cancel" : "Add Progress Data"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Data Input Form */}
        {showDataForm && (
          <div className="border rounded-md p-4 mb-6 bg-muted/30">
            <h3 className="text-lg font-medium mb-4">Add New Progress Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="assessment-date">Assessment Date</Label>
                <Input 
                  id="assessment-date" 
                  type="date" 
                  value={newDataPoint.date} 
                  onChange={e => handleDataInputChange('date', e.target.value)}
                />
              </div>

              <div className="mt-4 md:mt-0">
                <p className="mb-2 text-sm font-medium">Pain Level (0-10)</p>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[newDataPoint.painLevel || 5]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={([value]) => handleDataInputChange('painLevel', value)}
                  />
                  <span className="w-8 text-center font-medium">{newDataPoint.painLevel}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="mb-2 text-sm font-medium">Range of Motion (0-10)</p>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[newDataPoint.rangeOfMotion || 5]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={([value]) => handleDataInputChange('rangeOfMotion', value)}
                  />
                  <span className="w-8 text-center font-medium">{newDataPoint.rangeOfMotion}</span>
                </div>
              </div>
              
              <div>
                <p className="mb-2 text-sm font-medium">Strength (0-10)</p>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[newDataPoint.strength || 5]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={([value]) => handleDataInputChange('strength', value)}
                  />
                  <span className="w-8 text-center font-medium">{newDataPoint.strength}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="mb-2 text-sm font-medium">Functional Ability (0-10)</p>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[newDataPoint.functionalAbility || 5]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={([value]) => handleDataInputChange('functionalAbility', value)}
                  />
                  <span className="w-8 text-center font-medium">{newDataPoint.functionalAbility}</span>
                </div>
              </div>
              
              <div>
                <p className="mb-2 text-sm font-medium">Adherence to Program (0-10)</p>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[newDataPoint.adherence || 5]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={([value]) => handleDataInputChange('adherence', value)}
                  />
                  <span className="w-8 text-center font-medium">{newDataPoint.adherence}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDataForm(false)}>Cancel</Button>
              <Button onClick={addDataPoint}>Save Progress Data</Button>
            </div>
          </div>
        )}

        {/* Empty state message when no data exists */}
        {!showDataForm && data.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-md mb-6">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Progress Data Yet</h3>
            <p className="text-muted-foreground mb-4">
              Add progress assessment data to track rehabilitation outcomes over time
            </p>
            <Button onClick={() => setShowDataForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Progress Data
            </Button>
          </div>
        )}

        {/* Only show tabs when we have data */}
        {data.length > 0 && (
          <>
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
                {/* Add Goal Button */}
                <div className="mb-4 flex justify-end">
                  <Button 
                    onClick={() => setShowGoalForm(!showGoalForm)}
                    variant={showGoalForm ? "secondary" : "outline"}
                    size="sm"
                    className="gap-1"
                  >
                    {showGoalForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showGoalForm ? "Cancel" : "Add New Goal"}
                  </Button>
                </div>
                
                {/* Goal Input Form */}
                {showGoalForm && (
                  <div className="border rounded-md p-4 mb-6 bg-muted/30">
                    <h3 className="text-lg font-medium mb-4">Add New Rehabilitation Goal</h3>
                    
                    <div className="space-y-4 mb-4">
                      <div>
                        <Label htmlFor="goal-title">Goal Title</Label>
                        <Input 
                          id="goal-title" 
                          placeholder="e.g., Improve Walking Distance"
                          value={newGoal.goal}
                          onChange={e => handleGoalInputChange('goal', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="goal-description">Description</Label>
                        <Textarea 
                          id="goal-description" 
                          placeholder="Describe the specific, measurable goal"
                          value={newGoal.description}
                          onChange={e => handleGoalInputChange('description', e.target.value)}
                          rows={3}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="goal-date">Target Date</Label>
                          <Input 
                            id="goal-date" 
                            type="date"
                            value={newGoal.targetDate} 
                            onChange={e => handleGoalInputChange('targetDate', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="goal-status">Status</Label>
                          <Select 
                            defaultValue="in-progress"
                            onValueChange={(value) => handleGoalInputChange('status', value)}
                          >
                            <SelectTrigger id="goal-status">
                              <SelectValue placeholder="Select goal status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="achieved">Achieved</SelectItem>
                              <SelectItem value="modified">Modified</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="goal-progress">Current Progress ({newGoal.progress || 0}%)</Label>
                        <Slider
                          id="goal-progress"
                          value={[newGoal.progress || 0]}
                          min={0}
                          max={100}
                          step={5}
                          onValueChange={([value]) => handleGoalInputChange('progress', value)}
                          className="mt-2"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowGoalForm(false)}>Cancel</Button>
                      <Button onClick={addGoal}>Save Goal</Button>
                    </div>
                  </div>
                )}
                
                {/* Empty state for goals */}
                {goals.length === 0 && !showGoalForm && (
                  <div className="text-center py-12 border-2 border-dashed rounded-md">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Rehabilitation Goals Set</h3>
                    <p className="text-muted-foreground mb-4">
                      Add specific, measurable goals to track your patient's rehabilitation progress
                    </p>
                    <Button onClick={() => setShowGoalForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Goal
                    </Button>
                  </div>
                )}
                
                {/* Goals List */}
                {goals.length > 0 && (
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
                )}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}