import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BookOpen, 
  PlayCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Microscope,
  Brain,
  Users,
  FileText,
  Eye,
  Target
} from "lucide-react";
import type { ModuleContentSection } from "@shared/schema";
import { useCourseAI } from "@/hooks/use-course-ai";

interface SectionRendererProps {
  section: ModuleContentSection;
  sectionIndex: number;
  courseBodyPart?: string;
  onQuizComplete?: () => void;
}

export function SectionRenderer({ section, sectionIndex, courseBodyPart, onQuizComplete }: SectionRendererProps) {
  const { openBodyScanner, openMovementAnalysis, openVirtualPatients } = useCourseAI();
  
  switch (section.type) {
    case 'text':
      return <TextSection section={section} sectionIndex={sectionIndex} />;
    case 'video':
      return <VideoSection section={section} sectionIndex={sectionIndex} />;
    case 'quiz':
      return <QuizSection section={section} sectionIndex={sectionIndex} onComplete={onQuizComplete} />;
    case '3d_scanner':
      return <ScannerSection section={section} sectionIndex={sectionIndex} bodyPart={courseBodyPart} openScanner={openBodyScanner} />;
    case 'interactive':
      return <InteractiveSection section={section} sectionIndex={sectionIndex} openVirtualPatients={openVirtualPatients} />;
    default:
      return null;
  }
}

function TextSection({ section, sectionIndex }: { section: ModuleContentSection; sectionIndex: number }) {
  if (!section.content) return null;
  
  return (
    <Card className="mb-6" data-testid={`text-section-${sectionIndex}`}>
      {section.title && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {section.title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {/* Render the main content with proper formatting and preserve whitespace */}
          <div className="whitespace-pre-wrap leading-relaxed">{formatContent(section.content)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function VideoSection({ section, sectionIndex }: { section: ModuleContentSection; sectionIndex: number }) {
  if (!section.videoUrl) return null;
  
  const videoId = extractYouTubeId(section.videoUrl);
  
  return (
    <Card className="mb-6" data-testid={`video-section-${sectionIndex}`}>
      {section.title && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-red-600" />
            {section.title}
          </CardTitle>
          {section.videoDescription && (
            <CardDescription>{section.videoDescription}</CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent>
        {section.content && (
          <p className="text-sm text-muted-foreground mb-4">{section.content}</p>
        )}
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={section.title || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              data-testid={`video-iframe-${sectionIndex}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Video will be available soon</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuizSection({ section, sectionIndex, onComplete }: { section: ModuleContentSection; sectionIndex: number; onComplete?: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const questions = section.quizQuestions || [];
  
  const handleSubmit = () => {
    setSubmitted(true);
    setShowResults(true);
    const correct = questions.filter((q, i) => answers[i] === q.correctAnswer).length;
    if (correct === questions.length && onComplete) {
      onComplete();
    }
  };
  
  const correctCount = questions.filter((q, i) => answers[i] === q.correctAnswer).length;
  const totalCount = questions.length;
  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  
  return (
    <Card className="mb-6 border-purple-200 dark:border-purple-800" data-testid={`quiz-section-${sectionIndex}`}>
      <CardHeader className="bg-purple-50 dark:bg-purple-900/20">
        <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
          <Brain className="h-5 w-5" />
          {section.title || 'Knowledge Check'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {!submitted ? (
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="space-y-3" data-testid={`quiz-question-${qIndex}`}>
                <p className="font-medium">{qIndex + 1}. {q.question}</p>
                {q.options && (
                  <div className="space-y-2 pl-4">
                    {q.options.map((option, oIndex) => (
                      <label
                        key={oIndex}
                        className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name={`question-${qIndex}`}
                          value={option}
                          checked={answers[qIndex] === option}
                          onChange={(e) => setAnswers({ ...answers, [qIndex]: e.target.value })}
                          className="w-4 h-4"
                          data-testid={`quiz-option-${qIndex}-${oIndex}`}
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Button 
              onClick={handleSubmit} 
              disabled={Object.keys(answers).length < questions.length}
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="submit-quiz"
            >
              Submit Answers
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <Alert className={percentage >= 80 ? "border-green-200 bg-green-50 dark:bg-green-900/20" : "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-1">
                  Score: {correctCount}/{totalCount} ({percentage}%)
                </p>
                <p className="text-sm">
                  {percentage >= 80 ? "Great job! You've mastered this material." : "Review the explanations below and try again."}
                </p>
              </AlertDescription>
            </Alert>
            
            {questions.map((q, qIndex) => {
              const userAnswer = answers[qIndex];
              const isCorrect = userAnswer === q.correctAnswer;
              
              return (
                <div key={qIndex} className="space-y-2" data-testid={`quiz-result-${qIndex}`}>
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{qIndex + 1}. {q.question}</p>
                      {!isCorrect && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Your answer: {userAnswer}
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Correct answer: {q.correctAnswer}
                          </p>
                        </div>
                      )}
                      {q.explanation && (
                        <div className="mt-2 p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Explanation:</span> {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {percentage < 80 && (
              <Button 
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                  setShowResults(false);
                }}
                variant="outline"
                className="w-full"
                data-testid="retake-quiz"
              >
                Try Again
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScannerSection({ section, sectionIndex, bodyPart, openScanner }: { 
  section: ModuleContentSection; 
  sectionIndex: number;
  bodyPart?: string;
  openScanner: (bodyPart: string) => void;
}) {
  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800" data-testid={`scanner-section-${sectionIndex}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Microscope className="h-5 w-5" />
          {section.title || '3D Body Scanner Integration'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {section.content && (
          <p className="text-blue-700 dark:text-blue-300 mb-4">{section.content}</p>
        )}
        {section.interactiveData?.features && (
          <div className="flex flex-wrap gap-2 mb-4">
            {section.interactiveData.features.map((feature: string, i: number) => (
              <Badge key={i} variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                {feature.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        )}
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => openScanner(bodyPart || 'shoulder')}
          data-testid="open-body-scanner"
        >
          <Microscope className="h-4 w-4 mr-2" />
          Open Body Scanner
        </Button>
      </CardContent>
    </Card>
  );
}

function InteractiveSection({ section, sectionIndex, openVirtualPatients }: { 
  section: ModuleContentSection; 
  sectionIndex: number;
  openVirtualPatients: (pathology: string) => void;
}) {
  const interactiveType = section.interactiveType || 'case_study';
  
  return (
    <Card className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800" data-testid={`interactive-section-${sectionIndex}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
          {interactiveType === 'case_study' ? <Users className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          {section.title || 'Interactive Activity'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {section.content && (
          <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
            {formatContent(section.content)}
          </div>
        )}
        {interactiveType === 'case_study' && (
          <Button 
            className="bg-orange-600 hover:bg-orange-700"
            data-testid="open-case-study"
          >
            <Users className="h-4 w-4 mr-2" />
            Explore Case Study
          </Button>
        )}
        {interactiveType === '3d_model' && (
          <Button 
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => openVirtualPatients('shoulder')}
            data-testid="open-virtual-patient"
          >
            <Eye className="h-4 w-4 mr-2" />
            Open Virtual Patient
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
}

function formatContent(content: string): JSX.Element {
  // Simple markdown-like formatting
  const lines = content.split('\n');
  
  return (
    <>
      {lines.map((line, i) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-2xl font-bold mt-8 mb-4">{line.slice(2)}</h1>;
        }
        
        // Bold text
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold mt-3 mb-2">{line.slice(2, -2)}</p>;
        }
        
        // Lists
        if (line.startsWith('- ')) {
          return <li key={i} className="ml-4">{formatInlineText(line.slice(2))}</li>;
        }
        
        // Emoji markers
        if (line.startsWith('🚩') || line.startsWith('✓') || line.startsWith('✅')) {
          return <p key={i} className="mt-2">{formatInlineText(line)}</p>;
        }
        
        // Empty lines
        if (line.trim() === '') {
          return <br key={i} />;
        }
        
        // Regular paragraphs
        return <p key={i} className="mt-2">{formatInlineText(line)}</p>;
      })}
    </>
  );
}

function formatInlineText(text: string): JSX.Element {
  // Handle inline bold **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
