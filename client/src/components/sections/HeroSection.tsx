import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MessageSquareText, ClipboardList } from "lucide-react";

const HeroSection = () => {
  return (
    <section id="home" className="bg-gradient-to-br from-primary/90 to-secondary text-white py-20 md:py-32 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiAwaDZ2LTZoLTZ2NnptLTYtNnY2aC02di02aDZ6bS02IDBoLTZ2LTZoNnY2em0tNi02di02aC02djZoNnptLTYgMGgtNnY2aDZ2LTZ6bTM2LTZoLTZ2Nmg2di02em0tNiAwdi02aC02djZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50 mix-blend-overlay"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="md:flex md:items-center md:justify-between md:space-x-10">
          <div className="max-w-2xl md:max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              <span className="block">Transform your</span>
              <span className="block mt-2">physiotherapy practice with</span>
              <span className="text-white/90 inline-block bg-secondary px-2 rounded-lg mt-2">AI-powered conversations</span>
            </h1>
            <p className="mt-6 text-xl text-white/80 max-w-2xl">
              Streamline your clinical documentation with our advanced AI assistant that generates comprehensive SOAP notes from your patient interactions.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/clinical-notes">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-md flex items-center gap-2">
                  <MessageSquareText className="h-5 w-5" />
                  <span className="font-semibold">Try AI Notes</span>
                </Button>
              </Link>
              <Link href="#services">
                <Button size="lg" variant="outline" className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/40 shadow-sm flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  <span>Our Services</span>
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="hidden md:block mt-10 md:mt-0">
            <div className="relative w-80 h-80 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl p-6 flex items-center justify-center">
              <div className="absolute -top-5 -right-5 w-20 h-20 bg-secondary rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">AI</span>
              </div>
              <div className="w-full h-full rounded-lg bg-white/10 border border-white/20 p-4 overflow-hidden">
                <div className="flex items-start gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-3 w-3/4 bg-white/20 rounded-full mb-2"></div>
                    <div className="h-3 w-1/2 bg-white/20 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-start gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-3 w-5/6 bg-white/20 rounded-full mb-2"></div>
                    <div className="h-3 w-4/5 bg-white/20 rounded-full mb-2"></div>
                    <div className="h-3 w-2/3 bg-white/20 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-3 w-2/3 bg-white/20 rounded-full mb-2"></div>
                    <div className="h-3 w-1/2 bg-white/20 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
