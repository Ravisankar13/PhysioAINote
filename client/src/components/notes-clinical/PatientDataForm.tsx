import React, { useState } from "react";

// Define TypeScript interfaces for the component props
interface PatientData {
  firstname: string;
  middlename: string;
  lastname: string;
  gender: string;
  dob: string;
  weight: string;
  height_feet: string;
  height_inch: string;
  pastMedicalHistory: string;
  pastSurgicalHistory: string;
}

interface PatientDataFormProps {
  patientData: PatientData;
  onPatientDataChange: (data: PatientData) => void;
}

function PatientDataForm({
  patientData,
  onPatientDataChange,
}: PatientDataFormProps) {
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(
    null
  );

  const toggleAccordion = (accordionName: string) => {
    setExpandedAccordion(
      expandedAccordion === accordionName ? null : accordionName
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    onPatientDataChange({ ...patientData, [e.target.name]: e.target.value });
  };

  return (
    <div className="patient-data-card">
      <h2 className="card-title">Patient Data Creation</h2>
      <div className="accordion">
        <div className="accordion-item">
          <button
            className="accordion-header"
            onClick={() => toggleAccordion("demographic")}
          >
            Demographic Data
            <span className="accordion-icon">
              {expandedAccordion === "demographic" ? "▼" : "▶"}
            </span>
          </button>
          {expandedAccordion === "demographic" && (
            <div className="accordion-content">
              <input
                type="text"
                name="firstname"
                placeholder="First Name"
                value={patientData.firstname}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="middlename"
                placeholder="Middle Name"
                value={patientData.middlename}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="lastname"
                placeholder="Last Name"
                value={patientData.lastname}
                onChange={handleInputChange}
              />
              <select
                name="gender"
                value={patientData.gender}
                onChange={handleInputChange}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input
                type="date"
                name="dob"
                placeholder="Date of Birth"
                value={patientData.dob}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="weight"
                placeholder="Weight (lbs)"
                value={patientData.weight}
                onChange={handleInputChange}
              />
              <div className="height-inputs">
                <input
                  type="number"
                  name="height_feet"
                  placeholder="Height (ft)"
                  value={patientData.height_feet}
                  onChange={handleInputChange}
                />
                <input
                  type="number"
                  name="height_inch"
                  placeholder="Height (in)"
                  value={patientData.height_inch}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}
        </div>

        <div className="accordion-item">
          <button
            className="accordion-header"
            onClick={() => toggleAccordion("history")}
          >
            Medical History
            <span className="accordion-icon">
              {expandedAccordion === "history" ? "▼" : "▶"}
            </span>
          </button>
          {expandedAccordion === "history" && (
            <div className="accordion-content">
              <textarea
                name="pastMedicalHistory"
                placeholder="Past Medical History"
                value={patientData.pastMedicalHistory}
                onChange={handleInputChange}
              />
              <textarea
                name="pastSurgicalHistory"
                placeholder="Past Surgical History"
                value={patientData.pastSurgicalHistory}
                onChange={handleInputChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientDataForm;
