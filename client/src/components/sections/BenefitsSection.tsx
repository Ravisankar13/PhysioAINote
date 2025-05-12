import {
  Clock,
  ClipboardCheck,
  LineChart,
  Users,
  Shield,
  Lightbulb,
} from "lucide-react";

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const BenefitCard = ({ icon, title, description }: BenefitCardProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-100 hover:shadow-md transition-all duration-300 p-6">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
};

const BenefitsSection = () => {
  const benefits = [
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Save Time on Documentation",
      description: "Reduce documentation time by up to 70% with AI-assisted clinical notes generation, allowing you to focus more on patient care."
    },
    {
      icon: <ClipboardCheck className="h-6 w-6" />,
      title: "Standardized Clinical Notes",
      description: "Ensure consistency and completeness in your clinical documentation with structured SOAP format notes that meet professional standards."
    },
    {
      icon: <LineChart className="h-6 w-6" />,
      title: "Evidence-Based Practice",
      description: "Make treatment decisions supported by the latest research with our curated library of peer-reviewed articles organized by body part."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Learn from Peers",
      description: "Access shared de-identified clinical notes from experienced physiotherapists to enhance your knowledge and treatment approaches."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Privacy and Security",
      description: "Rest assured that your clinical data is protected with our secure platform that prioritizes patient confidentiality and data protection."
    },
    {
      icon: <Lightbulb className="h-6 w-6" />,
      title: "Continuous Improvement",
      description: "Stay at the forefront of physiotherapy practice with regularly updated research articles and AI models trained on best practices."
    }
  ];

  return (
    <section id="benefits" className="py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm text-primary font-medium mb-4">
            Why Choose PhysioAI
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Benefits for Modern Practitioners
          </h2>
          <div className="mt-4 max-w-2xl mx-auto">
            <p className="text-lg text-muted-foreground">
              Enhance your practice efficiency, clinical outcomes, and professional development
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <BenefitCard
              key={index}
              icon={benefit.icon}
              title={benefit.title}
              description={benefit.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;