import { Link } from "wouter";
import { 
  Users, 
  Sparkles, 
  Brain, 
  ClipboardList, 
  Trophy,
  ArrowRight,
  Play,
  Zap,
  Activity,
  Camera,
  Stethoscope
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CoreFeatureShowcase = () => {
  const features = [
    {
      id: "virtual-patient",
      icon: <Users className="h-8 w-8" />,
      title: "Virtual Patient Creator",
      subtitle: "The Future of Clinical Training",
      description: "Transform real movement data into comprehensive digital patients with AI-powered clinical analysis. Create realistic case studies from motion capture sessions with automated diagnostic insights and treatment recommendations.",
      keyFeatures: [
        "Real-time motion capture analysis",
        "AI-generated clinical correlations", 
        "3D patient visualization",
        "Automated case study creation",
        "Evidence-based diagnostic insights"
      ],
      primaryAction: {
        text: "Create Virtual Patient",
        href: "/virtual-patients",
        icon: <Play className="h-4 w-4" />
      },
      secondaryAction: {
        text: "Start Motion Capture",
        href: "/motion-capture",
        icon: <Camera className="h-4 w-4" />
      },
      bgGradient: "from-blue-600 to-purple-700",
      isMainFeature: true
    },
    {
      id: "ai-soap",
      icon: <Sparkles className="h-6 w-6" />,
      title: "Enhanced SOAP Notes",
      subtitle: "AI-Powered Documentation",
      description: "Generate comprehensive clinical documentation with real-time AI assistance, automatic transcription, and integrated PhysioGPT consultation for enhanced patient care.",
      keyFeatures: [
        "Voice-to-text transcription",
        "Real-time AI suggestions",
        "Automated SOAP generation",
        "Clinical decision support"
      ],
      primaryAction: {
        text: "Start Documentation",
        href: "/enhanced-soap-notes",
        icon: <Sparkles className="h-4 w-4" />
      },
      bgGradient: "from-purple-600 to-indigo-700"
    },
    {
      id: "physiogpt",
      icon: <Brain className="h-6 w-6" />,
      title: "PhysioGPT Assistant",
      subtitle: "Instant Clinical Consultation", 
      description: "Get immediate evidence-based recommendations for assessment and treatment planning with AI trained on physiotherapy expertise and current research.",
      keyFeatures: [
        "Evidence-based recommendations",
        "Treatment planning support",
        "Diagnostic assistance",
        "Research integration"
      ],
      primaryAction: {
        text: "Ask PhysioGPT",
        href: "/physiogpt",
        icon: <Brain className="h-4 w-4" />
      },
      bgGradient: "from-emerald-600 to-teal-700"
    },
    {
      id: "smart-assessment",
      icon: <ClipboardList className="h-6 w-6" />,
      title: "Smart Assessment Tools",
      subtitle: "Comprehensive Clinical Evaluation",
      description: "Access standardized outcome measures, specialized protocols, and evidence-based evaluation frameworks for thorough patient assessment.",
      keyFeatures: [
        "Standardized outcome measures",
        "Clinical assessment protocols",
        "Multi-plane postural analysis",
        "Evidence-based frameworks"
      ],
      primaryAction: {
        text: "Start Assessment",
        href: "/integrated-assessment",
        icon: <Stethoscope className="h-4 w-4" />
      },
      bgGradient: "from-amber-600 to-orange-700"
    },
    {
      id: "competitions",
      icon: <Trophy className="h-6 w-6" />,
      title: "Clinical Competitions",
      subtitle: "Real-Time Challenges",
      description: "Participate in competitive challenges including Lightning Diagnosis, Treatment Speed Run, and elimination tournaments with AI-powered scoring.",
      keyFeatures: [
        "Real-time competitions",
        "1v1 elimination tournaments", 
        "AI-powered scoring",
        "Peer rankings and achievements"
      ],
      primaryAction: {
        text: "Join Competition",
        href: "/competitions",
        icon: <Trophy className="h-4 w-4" />
      },
      bgGradient: "from-red-600 to-rose-700"
    }
  ];

  const MainFeatureCard = ({ feature }: { feature: typeof features[0] }) => (
    <Card className="border-none shadow-2xl overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-0">
        <div className={`bg-gradient-to-br ${feature.bgGradient} text-white p-8 lg:p-12`}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
              {feature.icon}
            </div>
            <div>
              <h2 className="text-3xl font-bold">{feature.title}</h2>
              <p className="text-white/80">{feature.subtitle}</p>
            </div>
          </div>
          <p className="text-lg text-white/90 mb-8 leading-relaxed">
            {feature.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={feature.primaryAction.href}>
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                {feature.primaryAction.icon}
                <span className="ml-2">{feature.primaryAction.text}</span>
              </Button>
            </Link>
            {feature.secondaryAction && (
              <Link href={feature.secondaryAction.href}>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  {feature.secondaryAction.icon}
                  <span className="ml-2">{feature.secondaryAction.text}</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
        <div className="p-8 lg:p-12 bg-gray-50">
          <h3 className="text-xl font-semibold mb-6 text-foreground">Key Features</h3>
          <div className="space-y-4">
            {feature.keyFeatures.map((keyFeature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-green-600"></div>
                </div>
                <span className="text-foreground/80">{keyFeature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );

  const FeatureCard = ({ feature }: { feature: typeof features[0] }) => (
    <Card className="border-none shadow-lg h-full flex flex-col group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <CardHeader className={`bg-gradient-to-br ${feature.bgGradient} text-white rounded-t-lg p-6`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
            {feature.icon}
          </div>
          <div>
            <CardTitle className="text-xl">{feature.title}</CardTitle>
            <p className="text-white/80 text-sm">{feature.subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-2 flex-grow">
        <CardDescription className="text-foreground/70 text-base mb-4 leading-relaxed">
          {feature.description}
        </CardDescription>
        <div className="space-y-2 mb-4">
          {feature.keyFeatures.slice(0, 3).map((keyFeature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-foreground/60">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <span>{keyFeature}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <div className="p-6 pt-0">
        <Link href={feature.primaryAction.href} className="w-full">
          <Button 
            variant="default" 
            className="w-full group-hover:scale-105 transition-transform"
          >
            {feature.primaryAction.icon}
            <span className="ml-2">{feature.primaryAction.text}</span>
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </Card>
  );

  const mainFeature = features.find(f => f.isMainFeature);
  const otherFeatures = features.filter(f => !f.isMainFeature);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium mb-4">
            <Zap className="h-4 w-4" />
            <span>Core Platform Features</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Five Essential Tools for Modern Physiotherapy
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to transform your clinical practice with AI-powered tools and competitive learning
          </p>
        </div>

        {/* Main Feature - Virtual Patient */}
        <div className="mb-16">
          {mainFeature && <MainFeatureCard feature={mainFeature} />}
        </div>

        {/* PhysioGPT - Secondary Feature */}
        <div className="mb-12">
          {(() => {
            const physioGPTFeature = otherFeatures.find(f => f.id === "physiogpt");
            if (!physioGPTFeature) return null;
            
            return (
              <Card className="border-none shadow-xl overflow-hidden">
                <div className="grid md:grid-cols-3 gap-0">
                  <div className={`bg-gradient-to-br ${physioGPTFeature.bgGradient} text-white p-8 md:p-10 md:col-span-2`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                        {physioGPTFeature.icon}
                      </div>
                      <div>
                        <h3 className="text-2xl md:text-3xl font-bold">{physioGPTFeature.title}</h3>
                        <p className="text-white/80">{physioGPTFeature.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-lg text-white/90 mb-6 leading-relaxed">
                      {physioGPTFeature.description}
                    </p>
                    <Link href={physioGPTFeature.primaryAction.href}>
                      <Button size="lg" variant="secondary" className="group">
                        {physioGPTFeature.primaryAction.icon}
                        <span className="ml-2">{physioGPTFeature.primaryAction.text}</span>
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                  <div className="bg-gray-50 p-8 md:p-10 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Brain className="h-12 w-12 text-emerald-600" />
                      </div>
                      <div className="space-y-3 text-sm">
                        {physioGPTFeature.keyFeatures.map((keyFeature, index) => (
                          <div key={index} className="flex items-center gap-2 justify-center">
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                            </div>
                            <span className="text-foreground/80 text-center">{keyFeature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })()}
        </div>

        {/* Other Core Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherFeatures.filter(f => f.id !== "physiogpt").map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoreFeatureShowcase;