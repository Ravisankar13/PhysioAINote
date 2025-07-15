import { Helmet } from "react-helmet";
import FocusedHero from "@/components/home/FocusedHero";
import CoreFeatureShowcase from "@/components/home/CoreFeatureShowcase";
import FeaturedCompetitions from "@/components/home/FeaturedCompetitions";
import GlobalLeaderboard from "@/components/home/GlobalLeaderboard";
import BenefitsSection from "@/components/sections/BenefitsSection";
import CTASection from "@/components/sections/CTASection";
import TrialBanner from "@/components/TrialBanner";

const Home = () => {
  return (
    <>
      <Helmet>
        <title>PhysioGPT - Comprehensive AI-Powered Clinical Platform</title>
        <meta
          name="description"
          content="Advanced physiotherapy platform combining core clinical tools (Virtual Patient Analysis, AI SOAP Notes, PhysioGPT, Smart Assessment) with competitive skill challenges and evidence-based learning resources."
        />
        <meta property="og:title" content="PhysioGPT - Comprehensive AI-Powered Clinical Platform" />
        <meta
          property="og:description"
          content="Advanced physiotherapy platform with AI-powered clinical tools and competitive learning challenges for evidence-based practice enhancement."
        />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-4">
        <TrialBanner />
      </div>
      
      {/* Hero Section */}
      <FocusedHero />
      
      {/* Primary Clinical Tools Section */}
      <CoreFeatureShowcase />
      
      {/* Featured Competitions Section */}
      <FeaturedCompetitions />
      
      {/* Community & Performance Section */}
      <GlobalLeaderboard />
      
      {/* Benefits and Call-to-Action */}
      <BenefitsSection />
      <CTASection />
    </>
  );
};

export default Home;
