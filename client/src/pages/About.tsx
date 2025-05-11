import { Helmet } from "react-helmet";
import { Card, CardContent } from "@/components/ui/card";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Us | PhysioAI</title>
        <meta
          name="description"
          content="Learn about PhysioAI's mission to revolutionize physiotherapy documentation with AI-powered clinical note generation technology."
        />
        <meta property="og:title" content="About Us | PhysioAI" />
        <meta
          property="og:description"
          content="Learn about PhysioAI's mission to revolutionize physiotherapy documentation."
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <section className="py-16 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-serif font-bold text-neutral-900 sm:text-4xl">
              About PhysioAI
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-neutral-500 sm:mt-4">
              Revolutionizing physiotherapy documentation with AI technology
            </p>
          </div>

          <Card className="bg-white mb-12">
            <CardContent className="p-8">
              <div className="prose max-w-none">
                <h2 className="text-2xl font-bold text-primary-700 mb-4">Our Mission</h2>
                <p className="mb-6">
                  At PhysioAI, our mission is to empower physiotherapists to deliver exceptional patient care by reducing administrative burden and enhancing clinical documentation. We believe that by combining cutting-edge AI technology with evidence-based physiotherapy practices, we can transform the way clinicians document patient interactions, enabling them to spend more time doing what they do best: helping patients recover and thrive.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mb-4">Our Story</h2>
                <p className="mb-6">
                  PhysioAI was founded by a team of physiotherapists and healthcare technology experts who experienced firsthand the challenges of clinical documentation. Realizing that physiotherapists often spent hours each day writing clinical notes, our founders set out to create a solution that would maintain the quality of documentation while significantly reducing the time required.
                </p>
                <p className="mb-6">
                  After years of development and collaboration with leading physiotherapy practices, we created our AI-powered SOAP note generator, which has since helped thousands of physiotherapists reclaim their time and improve their documentation processes.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mb-4">Our Approach</h2>
                <p className="mb-6">
                  We understand that every patient is unique, and so is every clinical encounter. Our AI technology doesn't aim to replace clinical reasoning; instead, it enhances it by organizing information in a structured, professional format while allowing clinicians to review and modify the output as needed.
                </p>
                <p className="mb-6">
                  Our commitment to privacy and security means that we adhere to the highest standards of data protection, ensuring that patient information remains confidential and secure at all times.
                </p>

                <h2 className="text-2xl font-bold text-primary-700 mb-4">Join Us</h2>
                <p>
                  We invite physiotherapists and clinics of all sizes to experience the benefits of AI-assisted documentation. Whether you're a solo practitioner looking to maximize your efficiency or a large clinic seeking to standardize documentation across your team, PhysioAI is here to support your practice's growth and success.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-8 md:grid-cols-3 mb-12">
            <Card className="bg-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-primary-700 mb-2">Innovation</h3>
                <p className="text-neutral-600">
                  We continuously refine our AI algorithms based on the latest research and user feedback to provide the most accurate and helpful documentation assistance.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-primary-700 mb-2">Quality</h3>
                <p className="text-neutral-600">
                  Our technology is designed to produce clinical notes that meet or exceed professional documentation standards while maintaining clarity and relevance.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-primary-700 mb-2">Support</h3>
                <p className="text-neutral-600">
                  We provide comprehensive support and training to ensure that our users can maximize the benefits of our platform in their daily practice.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
};

export default About;
