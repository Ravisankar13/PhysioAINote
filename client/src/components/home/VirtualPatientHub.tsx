import { Link } from "wouter";
import { 
  Users, 
  Brain, 
  FileText,
  Activity,
  Camera,
  Search,
  ArrowRight,
  Sparkles,
  Play,
  Stethoscope,
  Eye,
  BookOpen,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

const VirtualPatientHub = () => {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  // Central Virtual Patient feature
  const centralFeature = {
    id: "virtual-patients",
    title: "Virtual Patients",
    subtitle: "The Heart of Clinical Innovation",
    description: "Create, analyze, and learn from AI-powered virtual patients built from real movement data",
    icon: <Users className="h-10 w-10" />,
    href: "/virtual-patients",
    gradient: "from-emerald-500 to-teal-600"
  };

  // Connected features arranged around the center
  const connectedFeatures = [
    {
      id: "physiogpt",
      title: "PhysioGPT",
      subtitle: "AI Clinical Assistant",
      description: "Get instant evidence-based recommendations and clinical insights",
      icon: <Brain className="h-6 w-6" />,
      href: "/physiogpt",
      gradient: "from-emerald-500 to-teal-600",
      position: "top-left",
      connectionStory: "Analyze virtual cases with AI-powered clinical reasoning",
      connectionColor: "from-emerald-400 to-blue-500"
    },
    {
      id: "enhanced-soap",
      title: "Enhanced SOAP",
      subtitle: "Smart Documentation",
      description: "Generate comprehensive clinical notes with AI assistance",
      icon: <FileText className="h-6 w-6" />,
      href: "/enhanced-soap-notes",
      gradient: "from-emerald-500 to-teal-600",
      position: "top-right",
      connectionStory: "Document virtual patient interactions seamlessly",
      connectionColor: "from-emerald-400 to-blue-500"
    },
    {
      id: "movement-analysis",
      title: "Movement Analysis",
      subtitle: "Motion Capture",
      description: "Capture and analyze movement patterns in real-time",
      icon: <Activity className="h-6 w-6" />,
      href: "/movement-analysis",
      gradient: "from-emerald-500 to-teal-600",
      position: "middle-left",
      connectionStory: "Transform movement data into virtual patients",
      connectionColor: "from-emerald-400 to-blue-500"
    },
    {
      id: "body-scanner",
      title: "Body Scanner",
      subtitle: "3D Visualization",
      description: "Advanced anatomical scanning and visualization tools",
      icon: <Eye className="h-6 w-6" />,
      href: "/body-scanner",
      gradient: "from-emerald-500 to-teal-600",
      position: "middle-right",
      connectionStory: "Build detailed anatomical models for patients",
      connectionColor: "from-emerald-400 to-blue-500"
    },
    {
      id: "research-hub",
      title: "Research Hub",
      subtitle: "Evidence Base",
      description: "Access latest research and evidence-based protocols",
      icon: <BookOpen className="h-6 w-6" />,
      href: "/research",
      gradient: "from-emerald-500 to-teal-600",
      position: "bottom",
      connectionStory: "Evidence-based virtual case creation and validation",
      connectionColor: "from-emerald-400 to-blue-500"
    }
  ];

  const getFeaturePosition = (position: string) => {
    const positions = {
      "top-left": "absolute top-0 left-0 md:top-4 md:left-4 lg:top-8 lg:left-8 xl:top-12 xl:left-12 w-full md:w-64 lg:w-72 xl:w-80",
      "top-right": "absolute top-0 right-0 md:top-4 md:right-4 lg:top-8 lg:right-8 xl:top-12 xl:right-12 w-full md:w-64 lg:w-72 xl:w-80",
      "middle-left": "absolute left-0 top-1/2 -translate-y-1/2 md:left-4 lg:left-8 xl:left-12 w-full md:w-64 lg:w-72 xl:w-80",
      "middle-right": "absolute right-0 top-1/2 -translate-y-1/2 md:right-4 lg:right-8 xl:right-12 w-full md:w-64 lg:w-72 xl:w-80",
      "bottom": "absolute bottom-0 left-1/2 -translate-x-1/2 md:bottom-4 lg:bottom-8 xl:bottom-12 w-full md:w-72 lg:w-80 xl:w-96"
    };
    return positions[position as keyof typeof positions] || "";
  };

  const getConnectionPath = (position: string, isHovered: boolean) => {
    const opacity = isHovered ? "1" : "0.3";
    const strokeWidth = isHovered ? "3" : "2";
    
    // SVG paths from center to each position (adjusted for more spacing)
    const paths = {
      "top-left": `M 400 350 Q 220 220 160 160`,
      "top-right": `M 400 350 Q 580 220 640 160`,
      "middle-left": `M 400 350 L 160 350`,
      "middle-right": `M 400 350 L 640 350`,
      "bottom": `M 400 350 Q 400 520 400 600`
    };

    return (
      <path
        d={paths[position as keyof typeof paths]}
        stroke="url(#connectionGradient)"
        strokeWidth={strokeWidth}
        fill="none"
        opacity={opacity}
        className="transition-all duration-300"
        markerEnd="url(#arrowhead)"
      />
    );
  };

  return (
    <section className="py-20 bg-gradient-to-br from-primary/90 to-secondary relative overflow-hidden min-h-screen">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiAwaDZ2LTZoLTZ2NnptLTYtNnY2aC02di02aDZ6bS02IDBoLTZ2LTZoNnY2em0tNi02di02aC02djZoNnptLTYgMGgtNnY2aDZ2LTZ6bTM2LTZoLTZ2Nmg2di02em0tNiAwdi02aC02djZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50 mix-blend-overlay"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white font-medium mb-4">
            <Zap className="h-4 w-4 text-white" />
            <span className="text-white">Integrated Clinical Platform</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Virtual Patients at the Heart of Everything
          </h2>
          <p className="text-xl text-white/90 max-w-4xl mx-auto">
            Discover how Virtual Patients connect and enhance every aspect of your clinical practice
          </p>
        </div>

        {/* Interactive Hub - Desktop Layout */}
        <div className="hidden md:block relative h-[700px] lg:h-[850px] xl:h-[900px] w-full">
          {/* SVG for Connection Lines */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 800 700"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
              </linearGradient>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#3b82f6"
                />
              </marker>
            </defs>
            
            {/* Connection Lines */}
            {connectedFeatures.map((feature) => (
              <g key={`connection-${feature.id}`}>
                {getConnectionPath(feature.position, hoveredFeature === feature.id || hoveredFeature === 'virtual-patients')}
              </g>
            ))}
          </svg>

          {/* Central Virtual Patient Hub */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <Card 
              className="w-72 h-72 lg:w-80 lg:h-80 border-none shadow-2xl group cursor-pointer hover:scale-105 transition-all duration-300"
              onMouseEnter={() => setHoveredFeature('virtual-patients')}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className={`h-full bg-gradient-to-br ${centralFeature.gradient} text-white rounded-lg p-8 flex flex-col justify-center items-center text-center`}>
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {centralFeature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2">{centralFeature.title}</h3>
                <p className="text-white/90 text-sm mb-4">{centralFeature.subtitle}</p>
                <p className="text-white/80 text-xs mb-6 leading-relaxed">{centralFeature.description}</p>
                <Link href={centralFeature.href}>
                  <Button size="lg" variant="secondary" className="group-hover:scale-105 transition-transform">
                    <Play className="h-4 w-4 mr-2" />
                    Explore Virtual Patients
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Connected Feature Cards */}
          {connectedFeatures.map((feature) => (
            <div 
              key={feature.id} 
              className={getFeaturePosition(feature.position)}
            >
              <Card 
                className="border-none shadow-lg group cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 z-30 relative"
                onMouseEnter={() => setHoveredFeature(feature.id)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className={`bg-gradient-to-br ${feature.gradient} text-white rounded-t-lg p-4`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">{feature.title}</h4>
                      <p className="text-white/80 text-xs">{feature.subtitle}</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 bg-white">
                  <p className="text-sm text-foreground/70 mb-4">{feature.description}</p>
                  {hoveredFeature === feature.id && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <p className="text-xs text-blue-800 font-medium">
                        Connection: {feature.connectionStory}
                      </p>
                    </div>
                  )}
                  <Link href={feature.href}>
                    <Button size="sm" className="w-full group-hover:scale-105 transition-transform">
                      Explore
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-6">
          {/* Central Feature */}
          <Card className="border-none shadow-xl">
            <div className={`bg-gradient-to-br ${centralFeature.gradient} text-white rounded-t-lg p-6 text-center`}>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                {centralFeature.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{centralFeature.title}</h3>
              <p className="text-white/90 text-sm mb-4">{centralFeature.subtitle}</p>
              <p className="text-white/80 text-xs mb-4">{centralFeature.description}</p>
              <Link href={centralFeature.href}>
                <Button size="lg" variant="secondary">
                  <Play className="h-4 w-4 mr-2" />
                  Explore Virtual Patients
                </Button>
              </Link>
            </div>
          </Card>

          {/* Connected Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {connectedFeatures.map((feature) => (
              <Card key={feature.id} className="border-none shadow-lg group hover:shadow-xl transition-all duration-300">
                <div className={`bg-gradient-to-br ${feature.gradient} text-white rounded-t-lg p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-bold">{feature.title}</h4>
                      <p className="text-white/80 text-xs">{feature.subtitle}</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-xs text-foreground/70 mb-3">{feature.description}</p>
                  <div className="mb-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
                    {feature.connectionStory}
                  </div>
                  <Link href={feature.href}>
                    <Button size="sm" className="w-full">
                      Explore
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <Card className="inline-block bg-gradient-to-r from-primary to-primary/80 text-white border-none shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Sparkles className="h-6 w-6" />
                <h3 className="text-2xl font-bold">Ready to Experience the Future?</h3>
              </div>
              <p className="text-white/90 mb-6 max-w-2xl">
                Join thousands of physiotherapists who are transforming their practice with AI-powered virtual patients
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/virtual-patients">
                  <Button size="lg" variant="secondary">
                    <Users className="h-5 w-5 mr-2" />
                    Create Your First Virtual Patient
                  </Button>
                </Link>
                <Link href="/physiogpt">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    <Brain className="h-5 w-5 mr-2" />
                    Ask PhysioGPT
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default VirtualPatientHub;