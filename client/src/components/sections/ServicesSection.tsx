import {
  ActivitySquare,
  UserRound,
  HandMetal,
  HeartPulse,
  Baby,
  Brain,
} from "lucide-react";

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ServiceCard = ({ icon, title, description }: ServiceCardProps) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-neutral-100 overflow-hidden hover:shadow-lg transition-all duration-300 group hover:scale-[1.02]">
      <div className="p-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
            {icon}
          </div>
          <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
};

const ServicesSection = () => {
  const services = [
    {
      icon: <ActivitySquare className="h-7 w-7" />,
      title: "Sports Rehabilitation",
      description: "Specialized therapy for athletes and active individuals recovering from sports-related injuries."
    },
    {
      icon: <UserRound className="h-7 w-7" />,
      title: "Geriatric Physiotherapy",
      description: "Focused care for elderly patients to improve mobility, balance, and quality of life."
    },
    {
      icon: <HandMetal className="h-7 w-7" />,
      title: "Manual Therapy",
      description: "Hands-on treatments to reduce pain, improve range of motion, and restore function."
    },
    {
      icon: <HeartPulse className="h-7 w-7" />,
      title: "Post-Surgery Rehabilitation",
      description: "Structured recovery programs following orthopedic surgeries to restore optimal function."
    },
    {
      icon: <Baby className="h-7 w-7" />,
      title: "Women's Health",
      description: "Specialized treatments for pregnancy-related conditions, pelvic floor disorders, and post-partum care."
    },
    {
      icon: <Brain className="h-7 w-7" />,
      title: "Neurological Rehabilitation",
      description: "Treatment for conditions affecting the nervous system, including stroke, MS, and Parkinson's disease."
    }
  ];

  return (
    <section id="services" className="py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm text-primary font-medium mb-4">
            Our Services
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Comprehensive Physiotherapy Services
          </h2>
          <div className="mt-4 max-w-2xl mx-auto">
            <p className="text-lg text-muted-foreground">
              Expert care tailored to your unique needs and recovery goals
            </p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
