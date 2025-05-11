import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="bg-primary-700">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
        <h2 className="text-3xl font-serif font-bold tracking-tight text-white sm:text-4xl">
          <span className="block">Ready to enhance your practice?</span>
          <span className="block text-primary-200">Start using AI-powered clinical documentation today.</span>
        </h2>
        <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
          <div className="inline-flex rounded-md shadow">
            <Link href="/clinical-notes">
              <Button size="lg" variant="secondary" className="text-primary-600 bg-white hover:bg-primary-50">
                Get started
              </Button>
            </Link>
          </div>
          <div className="ml-3 inline-flex rounded-md shadow">
            <Link href="/contact">
              <Button size="lg" className="text-white bg-primary-800 hover:bg-primary-900">
                Learn more
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
