import React from "react";

interface SoapSummaries {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  goals?: string;
  treatment?: string;
}

interface SoapSummaryProps {
  summaries: SoapSummaries;
  isVisible: boolean;
}

const SoapSummary: React.FC<SoapSummaryProps> = ({ summaries, isVisible }) => {
  const soapSections = [
    { key: "subjective", title: "Subjective" },
    { key: "objective", title: "Objective" },
    { key: "assessment", title: "Assessment" },
    { key: "plan", title: "Plan" },
    { key: "goals", title: "Goals" },
    { key: "treatment", title: "Treatment" },
  ];

  // Don't render if not visible or no summaries
  if (!isVisible || Object.keys(summaries).length === 0) {
    return null;
  }

  return (
    <div className="soap-summary-card">
      <h2>SOAP Note Summary</h2>
      <div className="summary-sections">
        {soapSections.map(({ key, title }) => {
          const summary = summaries[key as keyof SoapSummaries];
          if (!summary) return null;

          return (
            <div key={key} className="summary-section">
              <h3>{title}</h3>
              <p className="summary-content">{summary}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SoapSummary;