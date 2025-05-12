import { Helmet } from "react-helmet";
import HeroSection from "@/components/sections/HeroSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import BenefitsSection from "@/components/sections/BenefitsSection";
import CTASection from "@/components/sections/CTASection";

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
      
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <CTASection />
    </>
  );
};

export default Home;
