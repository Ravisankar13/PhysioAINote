import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Calculator } from 'lucide-react';
import { AssessmentTemplate, AssessmentQuestion } from './AssessmentTemplates';

interface AssessmentFormProps {
  template: AssessmentTemplate;
  onComplete: (results: AssessmentResults) => void;
  onBack: () => void;
}

interface AssessmentResults {
  templateId: string;
  templateName: string;
  responses: { [questionId: string]: any };
  score?: number;
  interpretation?: string;
  recommendations?: string[];
  timestamp: Date;
}

export default function AssessmentForm({ template, onComplete, onBack }: AssessmentFormProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [questionId: string]: any }>({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = template.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / template.questions.length) * 100;

  const handleResponse = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const canProceed = () => {
    if (!currentQuestion.required) return true;
    const response = responses[currentQuestion.id];
    return response !== undefined && response !== '' && response !== null;
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < template.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      calculateResults();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateResults = () => {
    const results: AssessmentResults = {
      templateId: template.id,
      templateName: template.name,
      responses,
      timestamp: new Date()
    };

    // Calculate scores based on template type
    if (template.id === 'dash') {
      const scoreValues = Object.values(responses).map(val => {
        switch (val) {
          case 'No difficulty': return 1;
          case 'Mild difficulty': return 2;
          case 'Moderate difficulty': return 3;
          case 'Severe difficulty': return 4;
          case 'Unable': return 5;
          default: return 0;
        }
      });
      const totalScore = scoreValues.reduce((sum, val) => sum + val, 0);
      const dashScore = ((totalScore - template.questions.length) / (template.questions.length * 4)) * 100;
      results.score = Math.round(dashScore);
      results.interpretation = getDashInterpretation(dashScore);
      results.recommendations = getDashRecommendations(dashScore);
    }

    if (template.id === 'shoulder_impingement') {
      const positiveTests = Object.values(responses).filter(val => val === 'Positive').length;
      results.score = positiveTests;
      results.interpretation = getShoulderImpingementInterpretation(positiveTests);
      results.recommendations = getShoulderImpingementRecommendations(positiveTests);
    }

    if (template.id === 'low_back_stm') {
      const positiveResponses = Object.values(responses).filter(val => val === true).length;
      results.score = positiveResponses;
      results.interpretation = getSTarTBackInterpretation(positiveResponses);
      results.recommendations = getSTarTBackRecommendations(positiveResponses);
    }

    setShowResults(true);
    onComplete(results);
  };

  const getDashInterpretation = (score: number): string => {
    if (score <= 25) return 'Mild disability - Patient experiences some difficulty with daily activities';
    if (score <= 50) return 'Moderate disability - Significant impact on daily function';
    if (score <= 75) return 'Severe disability - Major functional limitations';
    return 'Extreme disability - Unable to perform most daily activities';
  };

  const getDashRecommendations = (score: number): string[] => {
    const recommendations = ['Monitor progress with regular reassessment'];
    if (score > 50) {
      recommendations.push('Consider referral to occupational therapy');
      recommendations.push('Implement activity modification strategies');
    }
    if (score > 75) {
      recommendations.push('Comprehensive multidisciplinary approach');
      recommendations.push('Consider workplace ergonomic assessment');
    }
    return recommendations;
  };

  const getShoulderImpingementInterpretation = (positiveTests: number): string => {
    if (positiveTests === 0) return 'Negative screen - Impingement syndrome unlikely';
    if (positiveTests <= 2) return 'Possible impingement - Consider differential diagnosis';
    return 'Positive screen - High likelihood of impingement syndrome';
  };

  const getShoulderImpingementRecommendations = (positiveTests: number): string[] => {
    const recommendations = ['Continue with comprehensive shoulder assessment'];
    if (positiveTests > 0) {
      recommendations.push('Assess scapular stability and posture');
      recommendations.push('Consider rotator cuff strengthening program');
    }
    if (positiveTests >= 3) {
      recommendations.push('Implement impingement-specific treatment protocol');
      recommendations.push('Consider imaging if conservative treatment fails');
    }
    return recommendations;
  };

  const getSTarTBackInterpretation = (score: number): string => {
    if (score <= 3) return 'Low risk - Suitable for self-management approach';
    if (score <= 6) return 'Medium risk - Consider physiotherapy intervention';
    return 'High risk - Requires comprehensive biopsychosocial approach';
  };

  const getSTarTBackRecommendations = (score: number): string[] => {
    if (score <= 3) {
      return [
        'Provide education about back pain',
        'Encourage early return to normal activities',
        'Simple advice on activity modification'
      ];
    }
    if (score <= 6) {
      return [
        'Structured physiotherapy program',
        'Manual therapy if appropriate',
        'Graduated exercise program',
        'Monitor for psychosocial factors'
      ];
    }
    return [
      'Comprehensive biopsychosocial assessment',
      'Address fear avoidance behaviors',
      'Consider cognitive behavioral approaches',
      'Multidisciplinary team approach'
    ];
  };

  const renderQuestion = (question: AssessmentQuestion) => {
    const response = responses[question.id];

    switch (question.type) {
      case 'text':
        return (
          <Textarea
            value={response || ''}
            onChange={(e) => handleResponse(question.id, e.target.value)}
            placeholder="Enter your response..."
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={response || ''}
            onChange={(e) => handleResponse(question.id, parseInt(e.target.value) || '')}
            placeholder="Enter number..."
          />
        );

      case 'select':
        return (
          <Select value={response || ''} onValueChange={(value) => handleResponse(question.id, value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={question.id}
              checked={response || false}
              onCheckedChange={(checked) => handleResponse(question.id, checked)}
            />
            <Label htmlFor={question.id}>Yes</Label>
          </div>
        );

      case 'scale':
        return (
          <RadioGroup value={response?.toString() || ''} onValueChange={(value) => handleResponse(question.id, parseInt(value))}>
            <div className="flex space-x-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex items-center space-x-2">
                  <RadioGroupItem value={num.toString()} id={`${question.id}-${num}`} />
                  <Label htmlFor={`${question.id}-${num}`}>{num}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      default:
        return null;
    }
  };

  if (showResults) {
    const results = {
      templateId: template.id,
      templateName: template.name,
      responses,
      timestamp: new Date()
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Assessment Complete: {template.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              Assessment Completed
            </div>
            <p className="text-muted-foreground">
              Results have been calculated and are ready for review
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
            <Button onClick={() => onComplete(results)}>
              View Results & Recommendations
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{template.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Question {currentQuestionIndex + 1} of {template.questions.length}
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800">
            Level {template.evidenceLevel}
          </Badge>
        </div>
        <Progress value={progress} className="w-full" />
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-2">
            {currentQuestion.required && (
              <AlertCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
            )}
            <div className="flex-1">
              <Label className="text-base font-medium">
                {currentQuestion.question}
                {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>
          </div>

          <div className="ml-6">
            {renderQuestion(currentQuestion)}
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            onClick={onBack}
            variant="outline"
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentQuestionIndex === 0 ? 'Back to Templates' : 'Previous'}
          </Button>

          <div className="flex gap-2">
            {currentQuestionIndex > 0 && (
              <Button onClick={prevQuestion} variant="outline">
                Previous Question
              </Button>
            )}
            <Button
              onClick={nextQuestion}
              disabled={!canProceed()}
            >
              {currentQuestionIndex === template.questions.length - 1 ? (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Results
                </>
              ) : (
                <>
                  Next Question
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { type AssessmentResults };