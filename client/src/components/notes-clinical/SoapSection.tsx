import React from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

interface SoapSectionProps {
  title: string;
  content: string;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  isSaving: boolean;
  useMarkdown?: boolean;
}

const SoapSection: React.FC<SoapSectionProps> = ({
  title,
  content,
  isEditing,
  setIsEditing,
  onContentChange,
  onSave,
  isSaving,
  useMarkdown = false,
}) => {
  return (
    <div className="soap-section">
      <h4>{title}</h4>
      {isEditing ? (
        <>
          <textarea
            className="soap-textarea"
            value={content || ""}
            onChange={(e) => onContentChange(e.target.value)}
          />
          <div className="button-group">
            <button
              className="save-button"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              className="cancel-button"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          {useMarkdown ? (
            <div
              className="soap-content markdown-content"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(content ? marked(content) : ""),
              }}
            />
          ) : (
            <div className="soap-content">
              {content || (
                <span className="empty-content">No content added yet</span>
              )}
            </div>
          )}
          <button className="edit-button" onClick={() => setIsEditing(true)}>
            Edit
          </button>
        </>
      )}
    </div>
  );
};

interface SoapNoteProps {
  soapNote: SoapNoteData | false;
  setSoapNote: (note: SoapNoteData | false) => void;
  sessionId: string | null;
  jwtToken: string;
  showCopyButton: boolean;
  copySoapToClipboard: () => void;
  copySuccess: boolean;
  isGeneratingSoapNote: boolean;
  generateSoapNote: () => void;
  isPolling: boolean;
}

interface SoapNoteData {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  status?: string;
}

const SoapNote: React.FC<SoapNoteProps> = ({
  soapNote,
  setSoapNote,
  sessionId,
  jwtToken,
  showCopyButton,
  copySoapToClipboard,
  copySuccess,
  isGeneratingSoapNote,
  generateSoapNote,
  isPolling,
}) => {
  const [editingSections, setEditingSections] = React.useState<
    Record<string, boolean>
  >({
    subjective: false,
    objective: false,
    assessment: false,
    plan: false,
  });

  const [savingSections, setSavingSections] = React.useState<
    Record<string, boolean>
  >({
    subjective: false,
    objective: false,
    assessment: false,
    plan: false,
  });

  // Initialize SOAP sections if not present
  const currentNote: SoapNoteData = soapNote || {
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    status: "pending",
  };

  const handleContentChange = (section: keyof SoapNoteData, value: string) => {
    if (soapNote) {
      setSoapNote({
        ...soapNote,
        [section]: value,
      });
    } else {
      setSoapNote({
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        [section]: value,
      });
    }
  };

  const saveSection = async (section: keyof SoapNoteData) => {
    if (!sessionId || !jwtToken) return;

    try {
      setSavingSections((prev) => ({ ...prev, [section]: true }));

      await fetch(
        "https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/update-soap-note",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            section: section,
            content: soapNote ? soapNote[section] : "",
          }),
        }
      );

      setEditingSections((prev) => ({ ...prev, [section]: false }));
    } catch (error) {
      console.error(`Error saving ${section} section:`, error);
    } finally {
      setSavingSections((prev) => ({ ...prev, [section]: false }));
    }
  };

  return (
    <div className="soap-note-container">
      <div className="soap-note-header">
        <h3>Clinical Note</h3>
        {showCopyButton && (
          <button
            className={`copy-button ${copySuccess ? "success" : ""}`}
            onClick={copySoapToClipboard}
          >
            {copySuccess ? "Copied!" : "Copy Note"}
          </button>
        )}
        {!soapNote && !isPolling && (
          <button
            className="generate-button"
            onClick={generateSoapNote}
            disabled={isGeneratingSoapNote}
          >
            {isGeneratingSoapNote ? "Generating..." : "Generate Clinical Note"}
          </button>
        )}
        {isPolling && (
          <div className="polling-message">
            Generating clinical note, please wait...
          </div>
        )}
      </div>

      {(soapNote || isPolling) && (
        <div className="soap-sections">
          <SoapSection
            title="Subjective"
            content={currentNote.subjective || ""}
            isEditing={editingSections.subjective}
            setIsEditing={(value) =>
              setEditingSections((prev) => ({ ...prev, subjective: value }))
            }
            onContentChange={(value) =>
              handleContentChange("subjective", value)
            }
            onSave={() => saveSection("subjective")}
            isSaving={savingSections.subjective}
            useMarkdown={true}
          />

          <SoapSection
            title="Objective"
            content={currentNote.objective || ""}
            isEditing={editingSections.objective}
            setIsEditing={(value) =>
              setEditingSections((prev) => ({ ...prev, objective: value }))
            }
            onContentChange={(value) => handleContentChange("objective", value)}
            onSave={() => saveSection("objective")}
            isSaving={savingSections.objective}
            useMarkdown={true}
          />

          <SoapSection
            title="Assessment"
            content={currentNote.assessment || ""}
            isEditing={editingSections.assessment}
            setIsEditing={(value) =>
              setEditingSections((prev) => ({ ...prev, assessment: value }))
            }
            onContentChange={(value) =>
              handleContentChange("assessment", value)
            }
            onSave={() => saveSection("assessment")}
            isSaving={savingSections.assessment}
            useMarkdown={true}
          />

          <SoapSection
            title="Plan"
            content={currentNote.plan || ""}
            isEditing={editingSections.plan}
            setIsEditing={(value) =>
              setEditingSections((prev) => ({ ...prev, plan: value }))
            }
            onContentChange={(value) => handleContentChange("plan", value)}
            onSave={() => saveSection("plan")}
            isSaving={savingSections.plan}
            useMarkdown={true}
          />
        </div>
      )}
    </div>
  );
};

export default SoapNote;
