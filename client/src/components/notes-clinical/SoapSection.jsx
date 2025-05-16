// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import DOMPurify from 'dompurify';
// import { marked } from 'marked';
// src/components/SoapNote.jsx
import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import DOMPurify from "dompurify";
import { marked } from "marked";

const SoapSection = ({
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
          <button
            className="soap-save-btn"
            onClick={() => {
              onSave();
              setIsEditing(false);
            }}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "✅ Save"}
          </button>
          <button
            className="soap-cancel-btn"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          {useMarkdown ? (
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(marked(content || "")),
              }}
            />
          ) : (
            <p>
              {content || `No ${title.toLowerCase()} information available.`}
            </p>
          )}
          <button className="soap-edit-btn" onClick={() => setIsEditing(true)}>
            ✏️ Edit
          </button>
        </>
      )}
    </div>
  );
};

const SoapNote = ({
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
  const [editingStates, setEditingStates] = useState({
    subjective: false,
    objective: false,
    assessment: false,
    plan: false,
    goals: false,
    treatment: false,
  });
  const [savingSoapNote, setSavingSoapNote] = useState(false);

  const handleContentChange = (key, value) => {
    setSoapNote((prev) => ({ ...prev, [key]: value }));
  };

  const saveSoapNoteChanges = useCallback(async () => {
    setSavingSoapNote(true);

    try {
      await axios.put(
        `https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/session/update?id=${sessionId}`,
        { soap_note: soapNote },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Reset all editing states
      setEditingStates({
        subjective: false,
        objective: false,
        assessment: false,
        plan: false,
        goals: false,
        treatment: false,
      });
    } catch (error) {
      alert("Error saving changes: " + error.message);
    } finally {
      setSavingSoapNote(false);
    }
  }, [sessionId, jwtToken, soapNote]);

  const toggleEditState = (key) => {
    setEditingStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const sections = [
    { key: "subjective", title: "Subjective", useMarkdown: true },
    { key: "objective", title: "Objective", useMarkdown: true },
    { key: "assessment", title: "Assessment", useMarkdown: true },
    { key: "plan", title: "Plan", useMarkdown: true },
    { key: "goals", title: "Goals", useMarkdown: true },
    { key: "treatment", title: "Treatment", useMarkdown: true },
  ];

  if (!soapNote && !isPolling) {
    return (
      <div className="soap-note-card">
        <h2>Clinical Note</h2>
        <button
          onClick={generateSoapNote}
          disabled={isGeneratingSoapNote}
          className="generate-soap-btn"
        >
          {isGeneratingSoapNote ? "Generating..." : "Generate Clinical Note"}
        </button>
      </div>
    );
  }

  if (soapNote && soapNote?.status == "in_progress" && !soapNote?.subjective) {
    return (
      <div className="soap-note-card">
        <h2>Clinical Note</h2>
        <p style={{ color: "black" }}>Generating Clinical Note...</p>
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="soap-note-card">
      <h2>Clinical Note</h2>
      <div className="soap-note-content">
        {sections.map(
          (section) =>
            soapNote &&
            soapNote[section.key] && (
              <SoapSection
                key={section.key}
                title={section.title}
                content={soapNote[section.key]}
                isEditing={editingStates[section.key]}
                setIsEditing={() => toggleEditState(section.key)}
                onContentChange={(value) =>
                  handleContentChange(section.key, value)
                }
                onSave={saveSoapNoteChanges}
                isSaving={savingSoapNote}
                useMarkdown={section.useMarkdown}
              />
            )
        )}
      </div>
      {showCopyButton && (
        <button
          className="copy-soap-btn"
          onClick={copySoapToClipboard}
          disabled={copySuccess}
        >
          {copySuccess ? "✅ Copied!" : "📋 Copy Note"}
        </button>
      )}
    </div>
  );
};

export default SoapNote;
