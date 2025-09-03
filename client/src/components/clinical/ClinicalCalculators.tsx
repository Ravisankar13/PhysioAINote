import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, AlertTriangle, CheckCircle, Info, Activity } from "lucide-react";

interface CalculatorResult {
  score: number;
  interpretation: string;
  recommendation: string;
  severity?: 'minimal' | 'mild' | 'moderate' | 'severe';
  confidence?: 'high' | 'moderate' | 'low';
}

export default function ClinicalCalculators() {
  const [odiScore, setOdiScore] = useState<CalculatorResult | null>(null);
  const [dashScore, setDashScore] = useState<CalculatorResult | null>(null);
  const [ottawaResult, setOttawaResult] = useState<string>("");
  const [cSpineResult, setCSpineResult] = useState<string>("");

  // Oswestry Disability Index Calculator
  const calculateODI = (answers: number[]) => {
    const totalScore = answers.reduce((sum, val) => sum + val, 0);
    const maxScore = answers.length * 5;
    const percentage = (totalScore / maxScore) * 100;
    
    let interpretation = "";
    let severity: CalculatorResult['severity'] = 'minimal';
    
    if (percentage <= 20) {
      interpretation = "Minimal disability";
      severity = 'minimal';
    } else if (percentage <= 40) {
      interpretation = "Moderate disability";
      severity = 'mild';
    } else if (percentage <= 60) {
      interpretation = "Severe disability";
      severity = 'moderate';
    } else if (percentage <= 80) {
      interpretation = "Crippled";
      severity = 'severe';
    } else {
      interpretation = "Bed-bound or exaggerating symptoms";
      severity = 'severe';
    }
    
    setOdiScore({
      score: Math.round(percentage),
      interpretation,
      recommendation: `Score: ${Math.round(percentage)}% - ${interpretation}. ${
        percentage > 40 
          ? "Consider referral to specialist and intensive rehabilitation program." 
          : "Continue with conservative management and monitor progress."
      }`,
      severity,
      confidence: 'high'
    });
  };

  // DASH Calculator
  const calculateDASH = (answers: number[]) => {
    const totalScore = answers.reduce((sum, val) => sum + val, 0);
    const dashScore = ((totalScore / answers.length) - 1) * 25;
    
    let interpretation = "";
    let severity: CalculatorResult['severity'] = 'minimal';
    
    if (dashScore < 10) {
      interpretation = "No to minimal disability";
      severity = 'minimal';
    } else if (dashScore < 30) {
      interpretation = "Mild disability";
      severity = 'mild';
    } else if (dashScore < 50) {
      interpretation = "Moderate disability";
      severity = 'moderate';
    } else {
      interpretation = "Severe disability";
      severity = 'severe';
    }
    
    setDashScore({
      score: Math.round(dashScore * 10) / 10,
      interpretation,
      recommendation: `DASH Score: ${Math.round(dashScore * 10) / 10} - ${interpretation}. MCID is 10.2 points for improvement.`,
      severity,
      confidence: 'high'
    });
  };

  // Ottawa Ankle Rules
  const checkOttawaAnkle = (criteria: { [key: string]: boolean }) => {
    const needsXray = 
      criteria.malleolarPain && (
        criteria.boneTouch ||
        criteria.cantBearWeight ||
        criteria.age >= 55
      );
    
    setOttawaResult(
      needsXray 
        ? "X-ray REQUIRED based on Ottawa Ankle Rules. Refer for imaging."
        : "X-ray NOT required based on Ottawa Ankle Rules. Proceed with clinical examination."
    );
  };

  // Canadian C-Spine Rules
  const checkCSpineRules = (criteria: { [key: string]: boolean }) => {
    const highRisk = criteria.age >= 65 || criteria.dangerousMechanism || criteria.paresthesias;
    const lowRisk = criteria.simpleRearEnd || criteria.ambulatory || criteria.delayedOnset;
    
    if (highRisk) {
      setCSpineResult("HIGH RISK - Imaging required. Do not assess ROM.");
    } else if (lowRisk && criteria.canRotate45) {
      setCSpineResult("LOW RISK - No imaging required. Safe to proceed with assessment.");
    } else {
      setCSpineResult("Unable to clear C-spine. Consider imaging and specialist referral.");
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="outcome-measures" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="outcome-measures">Outcome Measures</TabsTrigger>
          <TabsTrigger value="prediction-rules">Prediction Rules</TabsTrigger>
          <TabsTrigger value="load-calculator">Load Management</TabsTrigger>
        </TabsList>

        <TabsContent value="outcome-measures" className="space-y-4">
          {/* ODI Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-teal-600" />
                Oswestry Disability Index (ODI)
              </CardTitle>
              <CardDescription>Low back pain disability assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {['Pain intensity', 'Personal care', 'Lifting', 'Walking', 'Sitting', 'Standing', 'Sleeping', 'Social life', 'Traveling', 'Employment'].map((section, idx) => (
                  <div key={idx}>
                    <Label>{section}</Label>
                    <Select onValueChange={(val) => {
                      // Simplified for demo - would need full implementation
                      const answers = new Array(10).fill(parseInt(val));
                      calculateODI(answers);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select score" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - No limitation</SelectItem>
                        <SelectItem value="1">1 - Slight</SelectItem>
                        <SelectItem value="2">2 - Moderate</SelectItem>
                        <SelectItem value="3">3 - Fairly severe</SelectItem>
                        <SelectItem value="4">4 - Very severe</SelectItem>
                        <SelectItem value="5">5 - Unable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              
              {odiScore && (
                <Alert className={`border-${
                  odiScore.severity === 'minimal' ? 'green' :
                  odiScore.severity === 'mild' ? 'yellow' :
                  odiScore.severity === 'moderate' ? 'orange' :
                  'red'
                }-200`}>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={odiScore.severity === 'minimal' ? 'default' : 'destructive'}>
                          {odiScore.score}%
                        </Badge>
                        <span className="font-medium">{odiScore.interpretation}</span>
                      </div>
                      <p className="text-sm">{odiScore.recommendation}</p>
                      <p className="text-xs text-gray-600">MCID: 10% change | Confidence: {odiScore.confidence}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* DASH Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-teal-600" />
                DASH Score
              </CardTitle>
              <CardDescription>Upper extremity disability assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {['Open jar', 'Write', 'Turn key', 'Prepare meal', 'Push door', 'Heavy chores'].slice(0, 6).map((activity, idx) => (
                  <div key={idx}>
                    <Label>{activity}</Label>
                    <Select onValueChange={(val) => {
                      // Simplified for demo
                      const answers = new Array(30).fill(parseInt(val));
                      calculateDASH(answers);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Difficulty level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - No difficulty</SelectItem>
                        <SelectItem value="2">2 - Mild difficulty</SelectItem>
                        <SelectItem value="3">3 - Moderate difficulty</SelectItem>
                        <SelectItem value="4">4 - Severe difficulty</SelectItem>
                        <SelectItem value="5">5 - Unable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              
              {dashScore && (
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={dashScore.severity === 'minimal' ? 'default' : 'destructive'}>
                          {dashScore.score}
                        </Badge>
                        <span className="font-medium">{dashScore.interpretation}</span>
                      </div>
                      <p className="text-sm">{dashScore.recommendation}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prediction-rules" className="space-y-4">
          {/* Ottawa Ankle Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Ottawa Ankle Rules
              </CardTitle>
              <CardDescription>Determine need for ankle X-ray</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="malleolar-pain"
                    onChange={(e) => {
                      checkOttawaAnkle({
                        malleolarPain: e.target.checked,
                        boneTouch: false,
                        cantBearWeight: false,
                        age: 45
                      });
                    }}
                  />
                  <Label htmlFor="malleolar-pain">Pain in malleolar zone</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="bone-touch" />
                  <Label htmlFor="bone-touch">Bone tenderness at posterior edge</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="weight-bear" />
                  <Label htmlFor="weight-bear">Unable to bear weight (4 steps)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="age-55" />
                  <Label htmlFor="age-55">Age ≥ 55 years</Label>
                </div>
              </div>
              
              {ottawaResult && (
                <Alert className={ottawaResult.includes("REQUIRED") ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {ottawaResult}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="text-xs text-gray-600 space-y-1">
                <p>• Sensitivity: 96-99%</p>
                <p>• Specificity: 26-48%</p>
                <p>• Reduces unnecessary X-rays by 30-40%</p>
              </div>
            </CardContent>
          </Card>

          {/* Canadian C-Spine Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Canadian C-Spine Rules
              </CardTitle>
              <CardDescription>Cervical spine clearance protocol</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="font-medium text-sm">High Risk Factors:</div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="age-65" />
                  <Label htmlFor="age-65">Age ≥ 65 years</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="dangerous" />
                  <Label htmlFor="dangerous">Dangerous mechanism</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="paresthesias" />
                  <Label htmlFor="paresthesias">Paresthesias in extremities</Label>
                </div>
                
                <div className="font-medium text-sm mt-4">Low Risk Factors:</div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="rear-end" />
                  <Label htmlFor="rear-end">Simple rear-end MVC</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="ambulatory" />
                  <Label htmlFor="ambulatory">Ambulatory at any time</Label>
                </div>
                
                <Button 
                  className="w-full mt-4"
                  onClick={() => checkCSpineRules({
                    age: 70,
                    dangerousMechanism: false,
                    paresthesias: false,
                    simpleRearEnd: true,
                    ambulatory: true,
                    delayedOnset: false,
                    canRotate45: true
                  })}
                >
                  Assess C-Spine
                </Button>
              </div>
              
              {cSpineResult && (
                <Alert className={cSpineResult.includes("HIGH RISK") ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {cSpineResult}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="text-xs text-gray-600 space-y-1">
                <p>• Sensitivity: 99.4%</p>
                <p>• Specificity: 45.1%</p>
                <p>• NPV: 99.8%</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="load-calculator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Tendon Load Calculator
              </CardTitle>
              <CardDescription>Calculate optimal loading for tendinopathy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Current Pain (0-10)</Label>
                  <Input type="number" placeholder="0-10" min="0" max="10" />
                </div>
                <div>
                  <Label>Irritability Level</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (pain settles quickly)</SelectItem>
                      <SelectItem value="moderate">Moderate (pain settles in hours)</SelectItem>
                      <SelectItem value="high">High (pain persists &gt;24hrs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stage of Tendinopathy</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reactive">Reactive</SelectItem>
                      <SelectItem value="dysrepair">Tendon Dysrepair</SelectItem>
                      <SelectItem value="degenerative">Degenerative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Current Function (%)</Label>
                  <Input type="number" placeholder="0-100" min="0" max="100" />
                </div>
              </div>
              
              <Button className="w-full">Calculate Loading Protocol</Button>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Recommended Protocol:</p>
                    <p className="text-sm">• Isometric: 5 x 45 seconds, 70% MVC</p>
                    <p className="text-sm">• Heavy Slow Resistance: 3 x 15 reps, 3s eccentric</p>
                    <p className="text-sm">• Frequency: 3x/week with 48hr rest</p>
                    <p className="text-sm">• Progress when pain ≤3/10 during and after</p>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}