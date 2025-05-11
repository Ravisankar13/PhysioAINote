import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section id="home" className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Physiotherapy <span className="text-secondary-400">Enhanced</span> with AI
          </h1>
          <p className="mt-6 text-xl text-primary-100 max-w-2xl">
            Professional physiotherapy services with integrated AI assistance for comprehensive clinical documentation in SOAP format.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link href="/clinical-notes">
              <Button size="lg" variant="secondary" className="text-primary-700 bg-white hover:bg-primary-50">
                Try AI Notes
              </Button>
            </Link>
            <Link href="#services">
              <Button size="lg" className="text-white bg-secondary-600 hover:bg-secondary-700">
                Our Services
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
