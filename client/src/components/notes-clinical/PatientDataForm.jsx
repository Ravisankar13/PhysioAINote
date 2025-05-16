import React, { useState } from 'react';

function PatientDataForm({ patientData, onPatientDataChange }) {
  const [expandedAccordion, setExpandedAccordion] = useState(null);

  const toggleAccordion = (accordionName) => {
    setExpandedAccordion(expandedAccordion === accordionName ? null : accordionName);
  };

  const handleInputChange = (e) => {
    onPatientDataChange({ ...patientData, [e.target.name]: e.target.value });
  };

  return (
    <div className="patient-data-card">
      <h2 className="card-title">Patient Data Creation</h2>
      <div className="accordion">
        <div className="accordion-item">
          <button className="accordion-header" onClick={() => toggleAccordion('demographic')}>
            Demographic Data
            <span className="accordion-icon">{expandedAccordion === 'demographic' ? '▼' : '▶'}</span>
          </button>
          {expandedAccordion === 'demographic' && (
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
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="date"
                name="dob"
                placeholder="Date of Birth"
                value={patientData.dob}
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="weight"
                placeholder="Weight (kg)"
                value={patientData.weight}
                onChange={handleInputChange}
              />
              <div className="height-inputs">
                <input
                  type="number"
                  name="height_feet"
                  placeholder="Height (feet)"
                  value={patientData.height_feet}
                  onChange={handleInputChange}
                />
                <input
                  type="number"
                  name="height_inch"
                  placeholder="Height (inches)"
                  value={patientData.height_inch}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}
        </div>
        <div className="accordion-item">
          <button className="accordion-header" onClick={() => toggleAccordion('medical')}>
            Past Medical History
            <span className="accordion-icon">{expandedAccordion === 'medical' ? '▼' : '▶'}</span>
          </button>
          {expandedAccordion === 'medical' && (
            <div className="accordion-content">
              <textarea
                name="pastMedicalHistory"
                placeholder="Enter past medical history"
                value={patientData.pastMedicalHistory}
                onChange={handleInputChange}
              ></textarea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientDataForm;