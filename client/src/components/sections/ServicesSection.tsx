import {
  AccessibilityNew,
  Elderly,
  BackHand,
  Healing,
  PregnantWoman,
  Psychology
} from "@/components/ui/icon";

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ServiceCard = ({ icon, title, description }: ServiceCardProps) => {
  return (
    <div className="bg-neutral-50 rounded-lg shadow-sm border border-neutral-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="p-6">
        <div className="flex items-center">
          <div className="text-primary-500 mr-3">{icon}</div>
          <h3 className="text-lg font-medium text-neutral-900">{title}</h3>
        </div>
        <p className="mt-3 text-neutral-600">{description}</p>
      </div>
    </div>
  );
};

const ServicesSection = () => {
  const services = [
    {
      icon: <AccessibilityNew className="h-6 w-6" />,
      title: "Sports Rehabilitation",
      description: "Specialized therapy for athletes and active individuals recovering from sports-related injuries."
    },
    {
      icon: <Elderly className="h-6 w-6" />,
      title: "Geriatric Physiotherapy",
      description: "Focused care for elderly patients to improve mobility, balance, and quality of life."
    },
    {
      icon: <BackHand className="h-6 w-6" />,
      title: "Manual Therapy",
      description: "Hands-on treatments to reduce pain, improve range of motion, and restore function."
    },
    {
      icon: <Healing className="h-6 w-6" />,
      title: "Post-Surgery Rehabilitation",
      description: "Structured recovery programs following orthopedic surgeries to restore optimal function."
    },
    {
      icon: <PregnantWoman className="h-6 w-6" />,
      title: "Women's Health",
      description: "Specialized treatments for pregnancy-related conditions, pelvic floor disorders, and post-partum care."
    },
    {
      icon: <Psychology className="h-6 w-6" />,
      title: "Neurological Rehabilitation",
      description: "Treatment for conditions affecting the nervous system, including stroke, MS, and Parkinson's disease."
    }
  ];

  return (
    <section id="services" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-serif font-bold text-neutral-900 sm:text-4xl">
            Our Physiotherapy Services
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-neutral-500 sm:mt-4">
            Comprehensive care for a variety of conditions
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              icon={service.icon}
              title={service.title}
              description={service.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
