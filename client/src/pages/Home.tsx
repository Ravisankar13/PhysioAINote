import { Helmet } from "react-helmet";
import HeroSection from "@/components/sections/HeroSection";
import ServicesSection from "@/components/sections/ServicesSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import CTASection from "@/components/sections/CTASection";

const Home = () => {
  return (
    <>
      <Helmet>
        <title>PhysioAI - Physiotherapy & Clinical Notes</title>
        <meta
          name="description"
          content="Professional physiotherapy platform with AI-powered clinical notes generation, research articles, collaborative tools, and tiered membership options to enhance your practice."
        />
        <meta property="og:title" content="PhysioAI - Physiotherapy & Clinical Notes" />
        <meta
          property="og:description"
          content="Professional physiotherapy platform with AI-powered clinical notes generation, research articles, collaborative tools, and tiered membership options."
        />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <HeroSection />
      <FeaturesSection />
      <ServicesSection />
      <CTASection />
    </>
  );
};

export default Home;
