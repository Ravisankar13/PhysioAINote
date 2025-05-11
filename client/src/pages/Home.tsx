import { Helmet } from "react-helmet";
import HeroSection from "@/components/sections/HeroSection";
import ServicesSection from "@/components/sections/ServicesSection";
import CTASection from "@/components/sections/CTASection";

const Home = () => {
  return (
    <>
      <Helmet>
        <title>PhysioAI - Physiotherapy & Clinical Notes</title>
        <meta
          name="description"
          content="Professional physiotherapy services with AI-powered clinical notes generation in SOAP format. Enhance your practice with our advanced documentation tools."
        />
        <meta property="og:title" content="PhysioAI - Physiotherapy & Clinical Notes" />
        <meta
          property="og:description"
          content="Professional physiotherapy services with AI-powered clinical notes generation in SOAP format."
        />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <HeroSection />
      <ServicesSection />
      <CTASection />
    </>
  );
};

export default Home;
