import { Helmet } from "react-helmet";
import DashboardHero from "@/components/home/DashboardHero";
import PlatformFeatures from "@/components/home/PlatformFeatures";
import LiveActivity from "@/components/home/LiveActivity";
import BenefitsSection from "@/components/sections/BenefitsSection";
import CTASection from "@/components/sections/CTASection";
import TrialBanner from "@/components/TrialBanner";

const Home = () => {
  return (
    <>
      <Helmet>
        <title>PhysioAI - Digital Platform for Physiotherapists</title>
        <meta
          name="description"
          content="Digital platform for physiotherapists with AI-powered clinical notes generation, research articles, collaborative tools, and tiered membership options to enhance your practice efficiency."
        />
        <meta property="og:title" content="PhysioAI - Digital Platform for Physiotherapists" />
        <meta
          property="og:description"
          content="Digital platform for physiotherapists with AI-powered clinical notes generation, research articles, collaborative tools, and tiered membership options."
        />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-4">
        <TrialBanner />
      </div>
      <DashboardHero />
      <PlatformFeatures />
      <LiveActivity />
      <BenefitsSection />
      <CTASection />
    </>
  );
};

export default Home;
