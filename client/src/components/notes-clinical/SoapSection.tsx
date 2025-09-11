import React from "react";
// DOMPurify loaded via CDN globally
declare const DOMPurify: { sanitize: (html: string) => string };
const DOMPurifyInstance = (typeof window !== 'undefined' && (window as any).DOMPurify) ? (window as any).DOMPurify : { sanitize: (html: string) => html };
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
  isStreaming?: boolean;
  streamingComplete?: boolean;
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
  isStreaming = false,
  streamingComplete = false,
}) => {
  return (
    <div className={`soap-section ${isStreaming ? 'streaming' : ''} ${streamingComplete ? 'streaming-complete' : ''}`}>
      <h4>
        {title}
        {isStreaming && !streamingComplete && (
          <span className="streaming-indicator">
            <span className="streaming-dots">...</span>
            <span className="streaming-text">Generating</span>
          </span>
        )}
        {streamingComplete && (
          <span className="streaming-complete-indicator">✓</span>
        )}
      </h4>
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
                __html: DOMPurifyInstance.sanitize(content ? marked(content) : ""),
              }}
            />
          ) : (
            <div className={`soap-content ${isStreaming ? 'streaming-content' : ''}`}>
              {content || (
                <span className="empty-content">
                  {isStreaming ? 'Generating content...' : 'No content added yet'}
                </span>
              )}
              {isStreaming && content && (
                <span className="streaming-cursor">▌</span>
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
  isStreaming?: boolean;
  streamingStatus?: Record<string, { isStreaming: boolean; isComplete: boolean }>;
}

interface SoapNoteData {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  goals?: string;
  treatment?: string;
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
  isStreaming = false,
  streamingStatus = {},
}) => {
  const [editingSections, setEditingSections] = React.useState<
    Record<string, boolean>
  >({
    subjective: false,
    objective: false,
    assessment: false,
    plan: false,
    goals: false,
    treatment: false,
  });

  const [savingSections, setSavingSections] = React.useState<
    Record<string, boolean>
  >({
    subjective: false,
    objective: false,
    assessment: false,
    plan: false,
    goals: false,
    treatment: false,
  });

  // Initialize SOAP sections if not present
  const currentNote: SoapNoteData = soapNote || {
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    goals: "",
    treatment: "",
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
        goals: "",
        treatment: "",
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
        {!soapNote && !isPolling && !isStreaming && (
          <button
            className="generate-button"
            onClick={generateSoapNote}
            disabled={isGeneratingSoapNote}
          >
            {isGeneratingSoapNote ? "Generating..." : "Generate Clinical Note"}
          </button>
        )}
        {(isPolling || isStreaming) && (
          <div className="generation-message">
            {isStreaming ? (
              <span className="streaming-message">
                🔄 Streaming clinical note generation...
              </span>
            ) : (
              <span className="polling-message">
                Generating clinical note, please wait...
              </span>
            )}
          </div>
        )}
      </div>

      {(soapNote || isPolling || isStreaming) && (
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
            isStreaming={streamingStatus.subjective?.isStreaming || false}
            streamingComplete={streamingStatus.subjective?.isComplete || false}
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
            isStreaming={streamingStatus.objective?.isStreaming || false}
            streamingComplete={streamingStatus.objective?.isComplete || false}
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
            isStreaming={streamingStatus.assessment?.isStreaming || false}
            streamingComplete={streamingStatus.assessment?.isComplete || false}
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
            isStreaming={streamingStatus.plan?.isStreaming || false}
            streamingComplete={streamingStatus.plan?.isComplete || false}
          />

          <SoapSection
            title="Goals"
            content={currentNote.goals || ""}
            isEditing={editingSections.goals}
            setIsEditing={(value) =>
              setEditingSections((prev) => ({ ...prev, goals: value }))
            }
            onContentChange={(value) => handleContentChange("goals", value)}
            onSave={() => saveSection("goals")}
            isSaving={savingSections.goals}
            useMarkdown={true}
            isStreaming={streamingStatus.goals?.isStreaming || false}
            streamingComplete={streamingStatus.goals?.isComplete || false}
          />

          <SoapSection
            title="Treatment"
            content={currentNote.treatment || ""}
            isEditing={editingSections.treatment}
            setIsEditing={(value) =>
              setEditingSections((prev) => ({ ...prev, treatment: value }))
            }
            onContentChange={(value) => handleContentChange("treatment", value)}
            onSave={() => saveSection("treatment")}
            isSaving={savingSections.treatment}
            useMarkdown={true}
            isStreaming={streamingStatus.treatment?.isStreaming || false}
            streamingComplete={streamingStatus.treatment?.isComplete || false}
          />
        </div>
      )}
    </div>
  );
};

export default SoapNote;
