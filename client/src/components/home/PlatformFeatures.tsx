import { 
  Sparkles, 
  BookOpen, 
  Share2, 
  Activity, 
  Dumbbell, 
  ArrowRight,
  Camera,
  Stethoscope,
  Trophy,
  Users,
  Brain,
  Scan
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
  bgClass: string;
  iconClass: string;
  category: string;
}

const FeatureCard = ({
  icon,
  title,
  description,
  linkText,
  linkHref,
  bgClass,
  iconClass,
  category,
}: FeatureCardProps) => {
  return (
    <Card className="border-none shadow-lg h-full flex flex-col group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <CardHeader className={`${bgClass} text-white rounded-t-lg p-5 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
        <div className="relative">
          <div className={`w-12 h-12 rounded-lg ${iconClass} flex items-center justify-center mb-3`}>
            {icon}
          </div>
          <div className="text-xs font-medium text-white/80 mb-1">{category}</div>
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-2 flex-grow">
        <CardDescription className="text-foreground/70 text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
      <CardFooter className="pt-0">
        <Link href={linkHref} className="w-full">
          <Button
            variant="ghost"
            className="w-full justify-between p-0 hover:bg-transparent hover:text-primary group-hover:text-primary transition-colors"
          >
            <span>{linkText}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

const PlatformFeatures = () => {
  const clinicalFeatures = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Enhanced SOAP Notes",
      description: "AI-powered clinical documentation with real-time suggestions, automatic transcription, and integrated PhysioGPT consultation for comprehensive patient care.",
      linkText: "Start Documentation",
      linkHref: "/soap-notes",
      bgClass: "bg-gradient-to-br from-purple-600 to-indigo-700",
      iconClass: "bg-white/20",
      category: "Clinical Workflow"
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "PhysioGPT Assistant",
      description: "Instant clinical consultation with AI trained on physiotherapy expertise. Get evidence-based recommendations for assessment and treatment planning.",
      linkText: "Ask PhysioGPT",
      linkHref: "/physiogpt",
      bgClass: "bg-gradient-to-br from-emerald-600 to-teal-700",
      iconClass: "bg-white/20",
      category: "AI Assistant"
    },
    {
      icon: <Camera className="h-6 w-6" />,
      title: "Motion Capture Analysis",
      description: "Real-time movement analysis with AI-powered pose detection. Create virtual patients from captured motion data with clinical correlations.",
      linkText: "Start Capture",
      linkHref: "/motion-capture",
      bgClass: "bg-gradient-to-br from-blue-600 to-cyan-700",
      iconClass: "bg-white/20",
      category: "Movement Analysis"
    }
  ];

  const assessmentFeatures = [
    {
      icon: <Activity className="h-6 w-6" />,
      title: "Virtual Patients",
      description: "AI-generated virtual patients based on expert methodologies from Jo Gibson, Alison Grimaldi, and other renowned physiotherapists for clinical reasoning practice.",
      linkText: "Access Virtual Patients",
      linkHref: "/virtual-patients",
      bgClass: "bg-gradient-to-br from-rose-600 to-pink-700",
      iconClass: "bg-white/20",
      category: "Clinical Training"
    },
    {
      icon: <Stethoscope className="h-6 w-6" />,
      title: "Clinical Assessments",
      description: "Comprehensive assessment tools including standardized outcome measures, specialized protocols, and evidence-based evaluation frameworks.",
      linkText: "View Assessments",
      linkHref: "/integrated-assessment",
      bgClass: "bg-gradient-to-br from-amber-600 to-orange-700",
      iconClass: "bg-white/20",
      category: "Assessment Tools"
    },
    {
      icon: <Scan className="h-6 w-6" />,
      title: "Body Scanner",
      description: "Advanced 3D postural analysis with multi-plane assessment capabilities. Analyze movement patterns and identify clinical correlations.",
      linkText: "Start Analysis",
      linkHref: "/body-scanner",
      bgClass: "bg-gradient-to-br from-violet-600 to-purple-700",
      iconClass: "bg-white/20",
      category: "Postural Analysis"
    }
  ];

  const competitiveFeatures = [
    {
      icon: <Trophy className="h-6 w-6" />,
      title: "Clinical Competitions",
      description: "Real-time competitive challenges including Lightning Diagnosis, Treatment Speed Run, and Progressive Diagnostic Challenge with AI scoring.",
      linkText: "Join Competitions",
      linkHref: "/competitions",
      bgClass: "bg-gradient-to-br from-red-600 to-rose-700",
      iconClass: "bg-white/20",
      category: "Competitive Learning"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Tournament System",
      description: "1v1 elimination tournaments with real-time bracket progression. Compete against peers in challenging diagnostic scenarios.",
      linkText: "Enter Tournaments",
      linkHref: "/competitions",
      bgClass: "bg-gradient-to-br from-orange-600 to-red-700",
      iconClass: "bg-white/20",
      category: "Tournaments"
    },
    {
      icon: <Share2 className="h-6 w-6" />,
      title: "Peer Exchange",
      description: "Share anonymized case studies and collaborate with fellow physiotherapists. Learn from collective expertise and challenging clinical cases.",
      linkText: "Join Community",
      linkHref: "/shared-cases",
      bgClass: "bg-gradient-to-br from-green-600 to-emerald-700",
      iconClass: "bg-white/20",
      category: "Community"
    }
  ];

  const resourceFeatures = [
    {
      icon: <Dumbbell className="h-6 w-6" />,
      title: "Exercise Library",
      description: "Evidence-based exercise prescriptions with AI-powered recommendations. 270+ exercises organized by body part with progression protocols.",
      linkText: "Browse Exercises",
      linkHref: "/exercises",
      bgClass: "bg-gradient-to-br from-teal-600 to-cyan-700",
      iconClass: "bg-white/20",
      category: "Exercise Prescription"
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Research Database",
      description: "Curated collection of peer-reviewed research articles with AI analysis, bias assessment, and gap identification for evidence-based practice.",
      linkText: "Explore Research",
      linkHref: "/research",
      bgClass: "bg-gradient-to-br from-indigo-600 to-blue-700",
      iconClass: "bg-white/20",
      category: "Evidence Base"
    }
  ];

  const FeatureSection = ({ title, description, features }: { title: string; description: string; features: FeatureCardProps[] }) => (
    <div className="mb-16">
      <div className="text-center mb-8">
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{title}</h3>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{description}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </div>
  );

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            <span>Complete Platform Features</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Everything you need for modern physiotherapy
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive tools for clinical documentation, patient assessment, competitive learning, and evidence-based practice
          </p>
        </div>

        <FeatureSection 
          title="Clinical Workflow & AI" 
          description="Streamline your practice with intelligent documentation and AI-powered clinical support"
          features={clinicalFeatures} 
        />

        <FeatureSection 
          title="Assessment & Analysis" 
          description="Advanced tools for patient evaluation, movement analysis, and clinical decision making"
          features={assessmentFeatures} 
        />

        <FeatureSection 
          title="Competitive Learning" 
          description="Challenge yourself with real-time competitions, tournaments, and peer collaboration"
          features={competitiveFeatures} 
        />

        <FeatureSection 
          title="Knowledge & Resources" 
          description="Access comprehensive exercise libraries and evidence-based research for informed practice"
          features={resourceFeatures} 
        />
      </div>
    </section>
  );
};

export default PlatformFeatures;