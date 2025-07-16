import { Link } from "wouter";
import { 
  Play, 
  ArrowRight, 
  Sparkles,
  Users,
  Brain,
  ClipboardList,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CompactPatternRecognitionLeaderboard from "./CompactPatternRecognitionLeaderboard";

const FocusedHero = () => {
  return (
    <section className="bg-gradient-to-br from-primary/90 to-secondary text-white py-16 md:py-24 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiAwaDZ2LTZoLTZ2NnptLTYtNnY2aC02di02aDZ6bS02IDBoLTZ2LTZoNnY2em0tNi02di02aC02djZoNnptLTYgMGgtNnY2aDZ2LTZ6bTM2LTZoLTZ2Nmg2di02em0tNiAwdi02aC02djZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50 mix-blend-overlay"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Main Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Next-Generation Physiotherapy Platform</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Transform Your Clinical Practice
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-4xl mx-auto mb-8">
            Create virtual patients, generate AI-powered SOAP notes, and compete in real-time challenges with the most advanced physiotherapy platform available
          </p>
        </div>

        {/* Main Features Grid - 3 Column Layout */}
        <div className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Virtual Patient Feature */}
            <div className="lg:col-span-1">
              <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm overflow-hidden h-full">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Virtual Patient Creator</h2>
                      <p className="text-white/80 text-xs">Featured Tool</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/90 mb-4 leading-relaxed">
                    Create digital patients using AI-powered motion capture and clinical analysis.
                  </p>
                  
                  {/* Feature checklist */}
                  <div className="space-y-2 text-xs text-white/80 mb-4">
                    <div className="flex justify-between">
                      <span>Motion Analysis</span>
                      <span className="text-green-300">✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Clinical Correlation</span>
                      <span className="text-green-300">✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span>3D Visualization</span>
                      <span className="text-green-300">✓</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link href="/virtual-patients">
                      <Button size="sm" variant="secondary" className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        Create Patient
                      </Button>
                    </Link>
                    <Link href="/motion-capture">
                      <Button size="sm" variant="outline" className="w-full border-white/50 text-white hover:bg-white/20 hover:text-white bg-white/10">
                        Motion Capture
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>

            {/* Main Hero Content */}
            <div className="lg:col-span-1 flex flex-col justify-center text-center order-first lg:order-none">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Clinical Excellence Meets Innovation
              </h2>
              <p className="text-lg text-white/90 mb-6 leading-relaxed">
                Transform your practice with AI-powered tools, virtual patients, and competitive challenges that advance physiotherapy education.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/physio-gpt">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    <Brain className="h-5 w-5 mr-2" />
                    Start PhysioGPT
                  </Button>
                </Link>
                <Link href="/competitions">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/50 text-white hover:bg-white/20 hover:text-white bg-white/10">
                    <Trophy className="h-5 w-5 mr-2" />
                    Join Competitions
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pattern Recognition Leaderboard */}
            <div className="lg:col-span-1">
              <CompactPatternRecognitionLeaderboard />
            </div>

          </div>
        </div>

        {/* Core Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* AI SOAP Notes */}
          <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm group hover:bg-white/15 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">AI SOAP Notes</CardTitle>
              <CardDescription className="text-white/70">
                Enhanced clinical documentation with real-time AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/enhanced-soap-notes">
                <Button variant="secondary" size="sm" className="w-full group-hover:scale-105 transition-transform">
                  Start Documentation
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* PhysioGPT - Enhanced */}
          <Card className="bg-white/15 border-white/30 text-white backdrop-blur-sm group hover:bg-white/20 transition-all duration-300 ring-2 ring-emerald-400/30">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-400/30 flex items-center justify-center mb-3">
                <Brain className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold">PhysioGPT</CardTitle>
              <CardDescription className="text-emerald-100 font-medium">
                🧠 Instant AI Clinical Consultation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/physiogpt">
                <Button variant="secondary" size="sm" className="w-full group-hover:scale-105 transition-transform bg-emerald-500 hover:bg-emerald-400 text-white font-semibold">
                  Ask PhysioGPT
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Smart Assessment */}
          <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm group hover:bg-white/15 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                <ClipboardList className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Smart Assessment</CardTitle>
              <CardDescription className="text-white/70">
                Comprehensive clinical evaluation tools and protocols
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/integrated-assessment">
                <Button variant="secondary" size="sm" className="w-full group-hover:scale-105 transition-transform">
                  Start Assessment
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Competitions */}
          <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm group hover:bg-white/15 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-3">
                <Trophy className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Competitions</CardTitle>
              <CardDescription className="text-white/70">
                Real-time challenges and tournaments for skill development
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/competitions">
                <Button variant="secondary" size="sm" className="w-full group-hover:scale-105 transition-transform">
                  Join Competition
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FocusedHero;