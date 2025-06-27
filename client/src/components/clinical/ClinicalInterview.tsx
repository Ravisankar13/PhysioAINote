import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, ArrowRight, CheckCircle } from 'lucide-react';

// Interview categories and questions
interface Question {
  id: string;
  category: string;
  text: string;
  type: 'text' | 'scale' | 'multiple' | 'radio';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
}

interface ClinicalInterviewProps {
  posturalFindings?: any;
  motionFindings?: any;
  onInterviewComplete: (answers: Record<string, any>) => void;
  className?: string;
}

const INTERVIEW_QUESTIONS: Question[] = [
  {
    id: 'pain_location',
    category: 'Pain Assessment',
    text: 'Where is your primary pain located?',
    type: 'text'
  },
  {
    id: 'pain_intensity',
    category: 'Pain Assessment',
    text: 'Rate your current pain intensity (0-10 scale)',
    type: 'scale',
    scaleMin: 0,
    scaleMax: 10
  },
  {
    id: 'pain_duration',
    category: 'History',
    text: 'How long have you been experiencing this problem?',
    type: 'radio',
    options: ['Less than 1 week', '1-4 weeks', '1-3 months', '3-6 months', 'More than 6 months']
  },
  {
    id: 'onset',
    category: 'History',
    text: 'How did your symptoms begin?',
    type: 'radio',
    options: ['Sudden onset', 'Gradual onset', 'After injury/trauma', 'Unknown onset']
  },
  {
    id: 'aggravating_factors',
    category: 'Functional Assessment',
    text: 'What activities make your symptoms worse?',
    type: 'text'
  },
  {
    id: 'functional_impact',
    category: 'Functional Assessment',
    text: 'How much do your symptoms affect your daily activities? (0-10 scale)',
    type: 'scale',
    scaleMin: 0,
    scaleMax: 10
  }
];

export default function ClinicalInterview({ 
  posturalFindings, 
  motionFindings, 
  onInterviewComplete,
  className = ""
}: ClinicalInterviewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = INTERVIEW_QUESTIONS[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / INTERVIEW_QUESTIONS.length) * 100;

  const handleAnswer = (value: any) => {
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: value
    };
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < INTERVIEW_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Interview complete
      setIsComplete(true);
      onInterviewComplete(answers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const renderQuestionInput = () => {
    const currentAnswer = answers[currentQuestion.id];

    switch (currentQuestion.type) {
      case 'text':
        return (
          <Textarea
            placeholder="Type your answer here..."
            value={currentAnswer || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            className="min-h-[100px]"
          />
        );

      case 'scale':
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{currentQuestion.scaleMin}</span>
              <span>{currentQuestion.scaleMax}</span>
            </div>
            <Input
              type="range"
              min={currentQuestion.scaleMin}
              max={currentQuestion.scaleMax}
              value={currentAnswer || currentQuestion.scaleMin}
              onChange={(e) => handleAnswer(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center">
              <span className="text-2xl font-bold text-blue-600">
                {currentAnswer || currentQuestion.scaleMin}
              </span>
            </div>
          </div>
        );

      case 'radio':
        return (
          <RadioGroup
            value={currentAnswer || ''}
            onValueChange={handleAnswer}
            className="space-y-3"
          >
            {currentQuestion.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      default:
        return null;
    }
  };

  if (isComplete) {
    return (
      <Card className={`border-2 border-green-200 bg-green-50 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Interview Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700">
            Clinical interview completed successfully. Your responses have been recorded and will be used for diagnostic analysis.
          </p>
          <div className="mt-4 p-3 bg-white rounded border border-green-200">
            <h4 className="font-semibold mb-2">Interview Summary:</h4>
            <div className="space-y-1 text-sm">
              <div>• Pain intensity: {answers.pain_intensity || 'Not specified'}/10</div>
              <div>• Functional impact: {answers.functional_impact || 'Not specified'}/10</div>
              <div>• Duration: {answers.pain_duration || 'Not specified'}</div>
              <div>• Onset: {answers.onset || 'Not specified'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Clinical Interview
        </CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Question {currentQuestionIndex + 1} of {INTERVIEW_QUESTIONS.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-2">
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
              {currentQuestion.category}
            </span>
          </div>
          <h3 className="text-lg font-semibold mb-4">{currentQuestion.text}</h3>
          
          {renderQuestionInput()}
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
            className="flex items-center gap-2"
          >
            {currentQuestionIndex === INTERVIEW_QUESTIONS.length - 1 ? 'Complete Interview' : 'Next'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}