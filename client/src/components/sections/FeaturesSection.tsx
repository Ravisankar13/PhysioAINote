import { Link } from "wouter";
import { 
  Sparkles, 
  BookOpen, 
  Share2, 
  Activity,
  Dumbbell,
  ArrowRight,
  Zap,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
  bgClass: string;
  iconClass: string;
}

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  linkText, 
  linkHref,
  bgClass,
  iconClass
}: FeatureCardProps) => {
  return (
    <Card className="border-none shadow-md h-full flex flex-col">
      <CardHeader className={`${bgClass} text-white rounded-t-lg p-5`}>
        <div className={`w-12 h-12 rounded-lg ${iconClass} flex items-center justify-center mb-2`}>
          {icon}
        </div>
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 pb-2 flex-grow">
        <CardDescription className="text-foreground/70 text-base">
          {description}
        </CardDescription>
      </CardContent>
      <CardFooter className="pt-0">
        <Link href={linkHref}>
          <Button variant="ghost" className="p-0 hover:bg-transparent hover:text-primary flex items-center gap-1">
            <span>{linkText}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

const FeaturesSection = () => {
  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "AI-Powered Clinical Notes",
      description: "Generate comprehensive SOAP notes in seconds. Our AI assistant converts audio recordings into structured clinical documentation, saving you valuable time.",
      linkText: "Try AI Notes",
      linkHref: "/clinical-notes",
      bgClass: "bg-gradient-to-br from-purple-600 to-indigo-700",
      iconClass: "bg-white/20"
    },
    {
      icon: <Activity className="h-6 w-6" />,
      title: "Virtual Patients",
      description: "Practice clinical reasoning with AI-generated virtual patients. Test your diagnostic skills and treatment planning with realistic case simulations.",
      linkText: "Access Virtual Patients",
      linkHref: "/virtual-patients",
      bgClass: "bg-gradient-to-br from-rose-600 to-pink-700",
      iconClass: "bg-white/20"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Peer Exchange",
      description: "Share anonymized case studies and collaborate with fellow physiotherapists on challenging clinical cases. Learn from collective expertise and improve patient outcomes.",
      linkText: "Join Peer Exchange",
      linkHref: "/shared-cases",
      bgClass: "bg-gradient-to-br from-emerald-600 to-teal-700",
      iconClass: "bg-white/20"
    },
    {
      icon: <Dumbbell className="h-6 w-6" />,
      title: "Exercise & Manual Therapy",
      description: "Access our extensive library of evidence-based exercises and manual therapy techniques, categorized by body part and difficulty to enhance your treatment planning.",
      linkText: "Explore Library",
      linkHref: "/exercises",
      bgClass: "bg-gradient-to-br from-amber-600 to-orange-700",
      iconClass: "bg-white/20"
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Evidence-Based Research",
      description: "Access our curated collection of peer-reviewed physiotherapy research articles organized by body part to inform your clinical practice with the latest evidence.",
      linkText: "Browse Research",
      linkHref: "/research",
      bgClass: "bg-gradient-to-br from-blue-600 to-cyan-700",
      iconClass: "bg-white/20"
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium mb-4">
            <Zap className="h-4 w-4" />
            <span>Key Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            All the tools you need
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Enhance your physiotherapy practice with our comprehensive suite of digital tools designed for the modern clinician
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              linkText={feature.linkText}
              linkHref={feature.linkHref}
              bgClass={feature.bgClass}
              iconClass={feature.iconClass}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;