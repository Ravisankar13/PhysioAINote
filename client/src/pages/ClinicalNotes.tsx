import { useState } from "react";
import { Helmet } from "react-helmet";
import SoapForm from "@/components/notes/SoapForm";
import GeneratedNote from "@/components/notes/GeneratedNote";
import MembershipRequired from "@/components/MembershipRequired";

const ClinicalNotes = () => {
  const [generatedNote, setGeneratedNote] = useState<any>(null);
  const [showForm, setShowForm] = useState(true);

  const handleNoteGenerated = (noteData: any) => {
    setGeneratedNote(noteData);
    setShowForm(false);
  };

  const handleEditNote = () => {
    setShowForm(true);
  };

  return (
    <div>
      <Helmet>
        <title>Clinical Notes Generator | PhysioAI</title>
        <meta
          name="description"
          content="Generate comprehensive SOAP format clinical notes with AI assistance. Streamline your documentation process with our professional physiotherapy tools."
        />
        <meta property="og:title" content="Clinical Notes Generator | PhysioAI" />
        <meta
          property="og:description"
          content="Generate comprehensive SOAP format clinical notes with AI assistance."
        />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <MembershipRequired feature="aiNotes">
        <section className="py-16 bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-serif font-bold text-neutral-900 sm:text-4xl">
                AI-Powered Clinical Notes
              </h1>
              <p className="mt-4 text-xl text-neutral-600 max-w-2xl mx-auto">
                Generate comprehensive SOAP format notes based on your assessment data
              </p>
            </div>
            
            <div className="mt-12 bg-white rounded-lg shadow-sm overflow-hidden">
              {showForm ? (
                <SoapForm onSubmit={handleNoteGenerated} />
              ) : (
                <GeneratedNote 
                  noteData={generatedNote} 
                  onEdit={handleEditNote} 
                />
              )}
            </div>
          </div>
        </section>
      </MembershipRequired>
    </div>
  );
};

export default ClinicalNotes;