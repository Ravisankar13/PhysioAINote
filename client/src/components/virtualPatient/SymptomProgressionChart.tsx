import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

// Define types for our component
interface DataPoint {
  date: string;
  painLevel: number;
  mobility: number;
  functionality: number;
  swelling: number;
  stiffness: number;
}

interface SymptomProgressionChartProps {
  patientId: number;
  bodyPart: string;
  initialData?: DataPoint[];
}

// Sample color scheme for different metrics
const colorScheme = {
  painLevel: "#ef4444",       // Red
  mobility: "#22c55e",        // Green
  functionality: "#3b82f6",   // Blue
  swelling: "#eab308",        // Yellow
  stiffness: "#a855f7"        // Purple
};

// Pain level intensity descriptions
const painLevelDescriptions = [
  "No Pain (0)",
  "Mild (1-3)",
  "Moderate (4-6)",
  "Severe (7-9)",
  "Worst Possible (10)"
];

export default function SymptomProgressionChart({ patientId, bodyPart, initialData }: SymptomProgressionChartProps) {
  // States for the component
  const [timeRange, setTimeRange] = useState<string>("4weeks");
  const [metrics, setMetrics] = useState<string[]>(["painLevel", "mobility"]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // We'll use sample data for now - in a real app, this would come from the API
  const [data, setData] = useState<DataPoint[]>(initialData || generateSampleData());
  
  // Function to toggle a metric on or off
  const toggleMetric = (metric: string) => {
    if (metrics.includes(metric)) {
      setMetrics(metrics.filter(m => m !== metric));
    } else {
      setMetrics([...metrics, metric]);
    }
  };
  
  // Generate filtered data based on the selected time range
  const getFilteredData = () => {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeRange) {
      case "2weeks":
        cutoffDate.setDate(now.getDate() - 14);
        break;
      case "4weeks":
        cutoffDate.setDate(now.getDate() - 28);
        break;
      case "3months":
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case "6months":
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case "1year":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        cutoffDate.setDate(now.getDate() - 28); // Default to 4 weeks
    }
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
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
              {entry.name === "painLevel" && (
                <span className="ml-2 text-xs text-gray-500">
                  ({painLevelDescriptions[Math.min(Math.floor(entry.value / 2.5), 4)]})
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Helper function to format metric names for display
  const formatMetricName = (metric: string) => {
    switch (metric) {
      case "painLevel": return "Pain Level";
      case "mobility": return "Mobility";
      case "functionality": return "Functionality";
      case "swelling": return "Swelling";
      case "stiffness": return "Stiffness";
      default: return metric;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-3 md:space-y-0">
          <div>
            <CardTitle>Symptom Progression Chart</CardTitle>
            <CardDescription>
              Track symptom changes over time for {bodyPart}
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
                <SelectItem value="1year">1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge 
            variant={metrics.includes("painLevel") ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleMetric("painLevel")}
            style={{ backgroundColor: metrics.includes("painLevel") ? colorScheme.painLevel : undefined }}
          >
            Pain Level
          </Badge>
          <Badge 
            variant={metrics.includes("mobility") ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleMetric("mobility")}
            style={{ backgroundColor: metrics.includes("mobility") ? colorScheme.mobility : undefined }}
          >
            Mobility
          </Badge>
          <Badge 
            variant={metrics.includes("functionality") ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleMetric("functionality")}
            style={{ backgroundColor: metrics.includes("functionality") ? colorScheme.functionality : undefined }}
          >
            Functionality
          </Badge>
          <Badge 
            variant={metrics.includes("swelling") ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleMetric("swelling")}
            style={{ backgroundColor: metrics.includes("swelling") ? colorScheme.swelling : undefined }}
          >
            Swelling
          </Badge>
          <Badge 
            variant={metrics.includes("stiffness") ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleMetric("stiffness")}
            style={{ backgroundColor: metrics.includes("stiffness") ? colorScheme.stiffness : undefined }}
          >
            Stiffness
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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
              
              {metrics.includes("painLevel") && (
                <Line 
                  type="monotone" 
                  dataKey="painLevel" 
                  name="painLevel"
                  stroke={colorScheme.painLevel} 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
              )}
              
              {metrics.includes("mobility") && (
                <Line 
                  type="monotone" 
                  dataKey="mobility" 
                  name="mobility"
                  stroke={colorScheme.mobility} 
                  strokeWidth={2}
                />
              )}
              
              {metrics.includes("functionality") && (
                <Line 
                  type="monotone" 
                  dataKey="functionality" 
                  name="functionality"
                  stroke={colorScheme.functionality} 
                  strokeWidth={2}
                />
              )}
              
              {metrics.includes("swelling") && (
                <Line 
                  type="monotone" 
                  dataKey="swelling" 
                  name="swelling"
                  stroke={colorScheme.swelling} 
                  strokeWidth={2}
                />
              )}
              
              {metrics.includes("stiffness") && (
                <Line 
                  type="monotone" 
                  dataKey="stiffness" 
                  name="stiffness"
                  stroke={colorScheme.stiffness} 
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 p-4 bg-muted/30 rounded-md">
          <h4 className="text-sm font-semibold mb-2">Legend</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: colorScheme.painLevel }}></div>
              <span className="text-sm">Pain Level (0-10): Higher = More pain</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: colorScheme.mobility }}></div>
              <span className="text-sm">Mobility (0-10): Higher = Better mobility</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: colorScheme.functionality }}></div>
              <span className="text-sm">Functionality (0-10): Higher = Better function</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: colorScheme.swelling }}></div>
              <span className="text-sm">Swelling (0-10): Higher = More swelling</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2" style={{ backgroundColor: colorScheme.stiffness }}></div>
              <span className="text-sm">Stiffness (0-10): Higher = More stiffness</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to generate synthetic data for demo/development purposes
function generateSampleData(): DataPoint[] {
  const data: DataPoint[] = [];
  const now = new Date();
  
  // Create 90 days of data starting from 90 days ago
  for (let i = 90; i >= 0; i--) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    
    // Start with higher pain/swelling and lower mobility/functionality
    const daysSinceStart = 90 - i;
    
    // Pain decreases over time (with some random variation)
    const painLevel = Math.max(1, Math.min(10, 8 - (daysSinceStart / 15) + (Math.random() * 2 - 1)));
    
    // Mobility increases over time
    const mobility = Math.max(1, Math.min(10, 3 + (daysSinceStart / 12) + (Math.random() * 2 - 1)));
    
    // Functionality increases slightly later than mobility
    const functionality = Math.max(1, Math.min(10, 2 + (Math.max(0, daysSinceStart - 10) / 12) + (Math.random() * 2 - 1)));
    
    // Swelling decreases over time
    const swelling = Math.max(1, Math.min(10, 7 - (daysSinceStart / 18) + (Math.random() * 2 - 1)));
    
    // Stiffness improves but with a plateau
    const stiffness = Math.max(1, Math.min(10, 9 - (Math.min(daysSinceStart, 60) / 10) + (Math.random() * 2 - 1)));
    
    data.push({
      date: date.toISOString().split('T')[0],
      painLevel: Number(painLevel.toFixed(1)),
      mobility: Number(mobility.toFixed(1)),
      functionality: Number(functionality.toFixed(1)),
      swelling: Number(swelling.toFixed(1)),
      stiffness: Number(stiffness.toFixed(1)),
    });
  }
  
  return data;
}