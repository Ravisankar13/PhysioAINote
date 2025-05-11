import { useState } from "react";
import { Helmet } from "react-helmet";
import SoapForm from "@/components/notes/SoapForm";
import GeneratedNote from "@/components/notes/GeneratedNote";

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
    <>
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
      
      <section className="py-16 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-serif font-bold text-neutral-900 sm:text-4xl">
              AI-Powered Clinical Notes
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-neutral-500 sm:mt-4">
              Generate comprehensive SOAP notes with the help of AI technology
            </p>
          </div>

          <div className="mt-16 bg-white rounded-xl shadow-md overflow-hidden lg:grid lg:grid-cols-2 lg:gap-4">
            <div className="pt-10 pb-12 px-6 sm:px-10 lg:col-span-2">
              <div className="flex items-center justify-center">
                <img 
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&h=500&q=80" 
                  alt="Physiotherapist with patient" 
                  className="h-72 object-cover rounded-lg shadow-md mb-8" 
                />
              </div>
            </div>
          </div>

          {showForm && <SoapForm onNoteGenerated={handleNoteGenerated} />}
          
          {generatedNote && !showForm && (
            <GeneratedNote 
              noteData={generatedNote} 
              onEdit={handleEditNote} 
            />
          )}
        </div>
      </section>
    </>
  );
};

export default ClinicalNotes;
