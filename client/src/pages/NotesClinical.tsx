import React, { useState, useEffect, useRef, useDebugValue } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as lame from "@breezystack/lamejs";
import "./NotesClinical.css"; // Import the CSS file
// import { FaBars } from 'react-icons/fa';
import { FaBars, FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import TranscriptionTable from "../components/notes-clinical/Transcription";
import PatientDataForm from "../components/notes-clinical/PatientDataForm";
import SoapNote from "../components/notes-clinical/SoapSection";

// Define TypeScript interfaces
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

interface SoapNoteData {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  status?: string;
}

interface Session {
  id: string;
  name: string;
  user_id: string | null;
}

function NotesClinical(): React.ReactElement {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [lastKey, setLastKey] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showNewSession, setShowNewSession] = useState<boolean>(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editedSessionName, setEditedSessionName] = useState<string>("");
  const [editingSessionSaved, setEditingSessionSaved] =
    useState<boolean>(false);

  const [patientData, setPatientData] = useState<PatientData>({
    firstname: "",
    middlename: "",
    lastname: "",
    gender: "",
    dob: "",
    weight: "",
    height_feet: "",
    height_inch: "",
    pastMedicalHistory: "",
    pastSurgicalHistory: "",
  });
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [jwtToken, setJwtToken] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [uploadingAudio, setUploadingAudio] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordTime, setRecordTime] = useState<number>(0);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [soapNoteButton, setSoapNoteButton] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [loadingTranscript, setTranscriptLoading] = useState<boolean>(false);

  const [showCopyButton, setShowCopyButton] = useState<boolean>(false);
  const [transcriptPreSigned, setTranscriptPreSIgnedURL] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const chunksRef = useRef<Array<any>>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const recordingChunksRef = useRef<Array<Float32Array>>([]);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [soapNote, setSoapNote] = useState<SoapNoteData | false>(false);
  const [isGeneratingSoapNote, setIsGeneratingSoapNote] =
    useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if the user is logged in
    const checkUserAuth = async () => {
      try {
        const response = await fetch('/api/user');
        
        if (response.ok) {
          const userData = await response.json();
          setUserId(userData.id.toString());
          setIsLoading(false);
        } else {
          console.error("Not authenticated, redirecting to login");
          navigate('/auth');
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        navigate('/auth');
      }
    };
    
    checkUserAuth();
  }, [navigate]);

  const fetchSessions = async () => {
    if (!userId) return;
    
    try {
      // Use our local API endpoint for sessions that properly filters by user ID
      const response = await fetch('/api/sessions');

      if (response.ok) {
        const sessions_list = await response.json();
        
        // Define session type
        interface FormattedSession {
          id: string;
          name: string;
          user_id: string;
        }
        
        // Format the sessions for our component
        const formattedSessions: FormattedSession[] = sessions_list.map((session: any) => ({
          id: session.id.toString(),
          name: session.sessionName,
          user_id: session.userId.toString(),
        }));

        // Only set sessions that belong to the current user
        const userSessions = formattedSessions.filter(
          (session: FormattedSession) => session.user_id === userId
        );
        
        setSessions(userSessions);
      } else {
        console.error("Failed to fetch sessions:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchSessions();

      // Reset the editingSessionSaved state if it was true
      if (editingSessionSaved) {
        setEditingSessionSaved(false);
      }
    }
  }, [userId, editingSessionSaved]);

  const toggleSidebar = (): void => {
    setIsCollapsed((prev) => !prev);
  };

  const handleEditClick = (sessionId: string, sessionName: string): void => {
    setEditingSessionId(sessionId);
    setEditedSessionName(sessionName);
  };

  const handleCancelEdit = (): void => {
    setEditingSessionId(null);
    setEditedSessionName("");
  };
  //TODO: Integrate API for updating session name

  const handleSaveEdit = async (
    sessionId: string,
    newSessionName: string
  ): Promise<void> => {
    try {
      if (!newSessionName) {
        newSessionName = editedSessionName;
      }

      // Use our local API endpoint for updating sessions
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionName: newSessionName })
      });
      
      // Update the local state or trigger a refetch of sessions
      setEditingSessionId(null);
      setEditingSessionSaved(true);
    } catch (error) {
      alert("Error saving changes: " + (error as Error).message);
    }
  };

  const handleSessionClick = async (sessionId: string): Promise<void> => {
    setSelectedSession(sessionId); // Optionally, set the selected session
    setShowNewSession(true);

    try {
      // Use our local API endpoint for getting session details
      const response = await fetch(`/api/sessions/${sessionId}`);

      if (response.ok) {
        const session = await response.json();

        // Map response data to patientData structure
        setPatientData({
          firstname: session.firstName || "",
          middlename: session.middleName || "",
          lastname: session.lastName || "",
          gender: session.gender || "",
          dob: session.dob || "",
          weight: session.weight || "",
          height_feet: session.heightFeet || "",
          height_inch: session.heightInch || "",
          pastMedicalHistory: session.pastMedicalHistory || "",
          pastSurgicalHistory: session.pastSurgicalHistory || "",
        });

        // Set transcript URL if available
        if (session.transcriptUrl) {
          setTranscriptPreSIgnedURL(session.transcriptUrl);
          setShowTranscript(true);
        }

        // Process SOAP note if available
        let soapNoteResponse: SoapNoteData | false = false;
        if (session.soapNote) {
          if (typeof session.soapNote === 'string') {
            try {
              soapNoteResponse = JSON.parse(session.soapNote) as SoapNoteData;
            } catch (e) {
              console.error("Error parsing SOAP note:", e);
              soapNoteResponse = false;
            }
          } else {
            soapNoteResponse = session.soapNote as SoapNoteData;
          }

          if (soapNoteResponse) {
            setSoapNote(soapNoteResponse);
            setShowCopyButton(true);
          }
        }
        
        setSessionId(session.id.toString());
      } else {
        console.error("Failed to fetch session data:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
    }
  };

  const handleCreateNewSession = (): void => {
    setPatientData({
      firstname: "",
      middlename: "",
      lastname: "",
      gender: "",
      dob: "",
      weight: "",
      height_feet: "",
      height_inch: "",
      pastMedicalHistory: "",
      pastSurgicalHistory: "",
    });
    setSelectedSession(null);
    setShowNewSession(true);
    setSoapNote(false);
    setShowTranscript(false);
    setRecordTime(0);
    setAudioBlob(null);
  };

  const uploadDemographicData = async (): Promise<void> => {
    if (!jwtToken || !userId) {
      console.error("JWT token or user ID not found");
      return;
    }

    try {
      await axios.post(
        "https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/save-demographic-data",
        {
          ...patientData,
          user_id: userId,
          session_id: sessionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Error saving demogrphic data:", error);
    }
  };

  const generateSoapNote = async (): Promise<void> => {
    setIsGeneratingSoapNote(true);

    if (!jwtToken || !userId) {
      console.error("JWT token or user ID not found");
      setIsGeneratingSoapNote(false);
      return;
    }

    try {
      await axios.post(
        "https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/gen-soap-note",
        {
          ...patientData,
          user_id: userId,
          transcript_s3_uri: `s3://physio-convo-data/${sessionId}/transcript.csv`,
          session_id: sessionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      // Initialize an empty SOAP note
      const emptySoapNote: SoapNoteData = {
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        status: "pending",
      };
      setSoapNote(emptySoapNote);
      setIsPolling(true);
      pollSoapNote();
    } catch (error) {
      console.error("Error generating SOAP note:", error);
    }
    setIsGeneratingSoapNote(false);
  };

  const pollSoapNote = async (): Promise<void> => {
    if (!jwtToken) {
      console.error("JWT token not found");
      setIsPolling(false);
      return;
    }

    try {
      const response = await axios.post(
        "https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/polling-soap-note",
        { session_id: sessionId },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      if (response.data && response.data.soap_note) {
        const soapNoteData = JSON.parse(
          response.data.soap_note
        ) as SoapNoteData;
        setSoapNote(soapNoteData);
        if (soapNoteData.status === "completed") {
          setShowCopyButton(true);
          setIsPolling(false);
        } else {
          // If SOAP Note is still in progress, poll again after 5 seconds
          setTimeout(pollSoapNote, 5000);
        }
      } else {
        // If there's no soap_note in the response, poll again after 5 seconds
        setTimeout(pollSoapNote, 5000);
      }
    } catch (error) {
      console.error("Error polling SOAP note:", error);
      setIsPolling(false);
    }
  };

  const copySoapToClipboard = async (): Promise<void> => {
    if (!soapNote) {
      alert("Clinical note is not available yet.");
      return;
    }

    const contentToCopy = `
    Subjective: ${soapNote.subjective}
    Objective: ${soapNote.objective}
    Assessment: ${soapNote.assessment}
    Plan: ${soapNote.plan}
    `;

    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Feedback lasts for 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
      alert("Failed to copy text to clipboard.");
    }
  };

  const startRecording = async (): Promise<void> => {
    try {
      if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
      }
      setRecordTime(0);
      setTranscriptPreSIgnedURL("");
      setSoapNote(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 44100 },
      });
      mediaStreamRef.current = stream;

      // Fix for TypeScript webkitAudioContext issue
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 44100 });

      if (audioContextRef.current && stream) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        processorRef.current = audioContextRef.current.createScriptProcessor(
          4096,
          1,
          1
        );

        if (processorRef.current) {
          processorRef.current.onaudioprocess = (e: AudioProcessingEvent) => {
            if (isRecordingRef.current && !isPausedRef.current) {
              const channelData = e.inputBuffer.getChannelData(0);
              recordingChunksRef.current.push(new Float32Array(channelData));
            }
          };

          source.connect(processorRef.current);
          processorRef.current.connect(audioContextRef.current.destination);
        }
      }

      setIsRecording(true);
      isRecordingRef.current = true;
      setIsPaused(false);
      isPausedRef.current = false;
      recordingChunksRef.current = [];
      updateRecordTime();
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const updateRecordTime = (): void => {
    if (isRecordingRef.current && !isPausedRef.current) {
      setRecordTime((prevTime) => prevTime + 1);
      recordTimeoutRef.current = setTimeout(updateRecordTime, 1000);
    }
  };

  const pauseRecording = (): void => {
    if (isRecordingRef.current && !isPausedRef.current) {
      setIsPaused(true);
      isPausedRef.current = true;
      if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
      }
    }
  };

  const resumeRecording = (): void => {
    if (isRecordingRef.current && isPausedRef.current) {
      setIsPaused(false);
      isPausedRef.current = false;
      updateRecordTime();
    }
  };

  const stopRecording = (): void => {
    let currentDate = new Date();

    if (mediaStreamRef.current && isRecordingRef.current) {
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
      isPausedRef.current = false;
      setUploadingAudio(true);

      mediaStreamRef.current.getTracks().forEach((track) => track.stop());

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      if (processorRef.current) {
        processorRef.current.disconnect();
      }

      currentDate = new Date();

      convertToMp3();

      if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
      }
    }
  };

  const convertToMp3 = (): void => {
    const mp3Encoder = new lame.Mp3Encoder(1, 44100, 192);
    const samples = flattenBuffers(recordingChunksRef.current);
    const mp3Data: Uint8Array[] = [];
    const maxSamples = 1152;

    for (let i = 0; i < samples.length; i += maxSamples) {
      const sampleChunk = samples.subarray(i, i + maxSamples);
      const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const mp3buf = mp3Encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    const blob = new Blob(mp3Data, { type: "audio/mpeg" });
    setAudioBlob(blob);
  };

  const flattenBuffers = (buffers: Float32Array[]): Int16Array => {
    const length = buffers.reduce(
      (sum: number, buffer: Float32Array) => sum + buffer.length,
      0
    );
    const result = new Int16Array(length);
    let offset = 0;
    buffers.forEach((buffer: Float32Array) => {
      const int16Buffer = new Int16Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        int16Buffer[i] = Math.max(
          -32768,
          Math.min(32767, Math.floor(buffer[i] * 32768))
        );
      }
      result.set(int16Buffer, offset);
      offset += buffer.length;
    });
    return result;
  };

  const handleRecordToggle = (): void => {
    if (isRecording) {
      if (isPaused) {
        resumeRecording();
      } else {
        pauseRecording();
      }
    } else {
      startRecording();
    }
  };

  const uploadAudio = async (): Promise<void> => {
    const currentDate = new Date();
    console.log("Inside UploadAudio API call", currentDate);
    if (!audioBlob) return;
    
    setUploadingAudio(true);
    
    try {
      // First, create a session if we don't have one
      if (!sessionId) {
        await createNewSession();
      }
      
      if (!sessionId) {
        throw new Error("No session ID available for audio upload");
      }
      
      // Create form data for audio upload
      const formData = new FormData();
      formData.append('audio', audioBlob, `audio_${Date.now()}.mp3`);
      formData.append('duration', recordTime.toString());
      
      // Upload audio file to our local API
      const uploadResponse = await fetch(`/api/sessions/${sessionId}/audio`, {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Audio upload failed: ${uploadResponse.statusText}`);
      }
      
      // Successfully uploaded audio - now show transcript UI
      setUploadingAudio(false);
      setShowTranscript(true);
      setTranscriptLoading(true);
      
      // Request transcription from our session
      const transcribeResponse = await fetch(`/api/sessions/${sessionId}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!transcribeResponse.ok) {
        throw new Error(`Transcription request failed: ${transcribeResponse.statusText}`);
      }
      
      const transcribeData = await transcribeResponse.json();
      
      // Set transcript data
      if (transcribeData.transcript) {
        setTranscript(transcribeData.transcript);
      }
      
      if (transcribeData.session && transcribeData.session.transcriptUrl) {
        setTranscriptPreSIgnedURL(transcribeData.session.transcriptUrl);
      }
      
      setTranscriptLoading(false);
      
      // Refresh sessions list
      fetchSessions();
      
    } catch (error) {
      console.error("Error uploading audio:", error);
      setUploadingAudio(false);
      setTranscriptLoading(false);
    }
  };
  
  // Helper function to create a new session if we don't have one
  const createNewSession = async (): Promise<void> => {
    // Create a default session name with patient info or timestamp
    const sessionName = patientData.firstname && patientData.lastname 
      ? `${patientData.firstname} ${patientData.lastname}` 
      : `Session ${new Date().toLocaleString()}`;
    
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionName,
          firstName: patientData.firstname || '',
          middleName: patientData.middlename || '',
          lastName: patientData.lastname || '',
          gender: patientData.gender || '',
          dob: patientData.dob || '',
          weight: patientData.weight || '',
          heightFeet: patientData.height_feet || '',
          heightInch: patientData.height_inch || '',
          pastMedicalHistory: patientData.pastMedicalHistory || '',
          pastSurgicalHistory: patientData.pastSurgicalHistory || ''
        })
      });
      
      if (response.ok) {
        const session = await response.json();
        setSessionId(session.id.toString());
        setSelectedSession(session.id.toString());
      } else {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (audioBlob) {
      uploadAudio();
    }
  }, [audioBlob]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loader" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="main-layout">
        <div className={`sessions-card ${isCollapsed ? "collapsed" : ""}`}>
          <button
            className="hamburger-btn"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <FaBars />
          </button>

          <div className="sessions-content">
            <h2>Sessions</h2>
            <button
              className="create-session-btn"
              onClick={handleCreateNewSession}
            >
              + Create New Session
            </button>
            <ul>
              {sessions.map((session) => (
                <li key={session.id}>
                  <button
                    onClick={() => handleSessionClick(session.id)}
                    className={
                      selectedSession && selectedSession === session.id
                        ? "active"
                        : ""
                    }
                  >
                    {session.name}
                    <FaEdit
                      className="edit-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(session.id, session.name);
                      }}
                    />
                  </button>
                  {editingSessionId && editingSessionId === session.id && (
                    <div className="editing-session">
                      <input
                        type="text"
                        value={editedSessionName}
                        onChange={(e) => setEditedSessionName(e.target.value)}
                        className="edit-session-input"
                      />
                      <div className="edit-buttons">
                        <button
                          onClick={() =>
                            handleSaveEdit(session.id, editedSessionName)
                          }
                          className="save-edit-btn"
                          aria-label="Save edit"
                        >
                          <FaCheck /> Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="cancel-edit-btn"
                          aria-label="Cancel edit"
                        >
                          <FaTimes /> Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* <div className="pagination-controls">
            <button onClick={handlePreviousPage} disabled={page === 1}>
              Previous
            </button>
            <span>Page {page}</span>
            <button onClick={handleNextPage}>
              Next
            </button>
          </div> */}
          </div>
        </div>

        {
          /* selectedSession && */
          showNewSession && (
            <div className="content-card">
              <PatientDataForm
                patientData={patientData}
                onPatientDataChange={setPatientData}
              />

              <div className="audio-card">
                <h2>Record Audio Note</h2>
                <div className="record-button" onClick={handleRecordToggle}>
                  {isRecording ? (
                    isPaused ? (
                      "Resume"
                    ) : (
                      "Pause"
                    )
                  ) : (
                    <>
                      <svg className="mic-icon" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                    </>
                  )}
                </div>
                {/* <span>Start</span> */}
                {isRecording && (
                  <div className="stop-button" onClick={stopRecording}>
                    Stop
                  </div>
                )}
                <div className="recording-status">
                  {isRecording ? (
                    isPaused ? (
                      "Paused"
                    ) : (
                      "Recording..."
                    )
                  ) : uploadingAudio ? (
                    <>
                      <p style={{ color: "black" }}>Uploading Audio</p>
                      <div className="loader" />
                    </>
                  ) : (
                    "Click to start recording"
                  )}
                </div>
                {recordTime ? (
                  <div className="record-time">
                    Recording Time: {Math.floor(recordTime / 60)}:
                    {recordTime % 60 < 10 ? "0" : ""}
                    {recordTime % 60}
                  </div>
                ) : (
                  ""
                )}
                {/* {audioBlob && (
                  <div>
                    <audio src={URL.createObjectURL(audioBlob)} controls />
                    <button onClick={handleDownload}>Download Recording</button>
                  </div>
                )} */}
              </div>

              {/* { recordTime > 0 && */}
              {showTranscript && (
                <div className="transcript-card">
                  {loadingTranscript ? (
                    <>
                      <p style={{ color: "black" }}>
                        Generating Audio Transcript
                      </p>
                      <div className="loader" />
                    </>
                  ) : (
                    <TranscriptionTable transcriptUrl={transcriptPreSigned} />
                  )}
                </div>
              )}

              {showTranscript && !loadingTranscript && (
                <SoapNote
                  soapNote={soapNote}
                  setSoapNote={setSoapNote}
                  sessionId={sessionId}
                  jwtToken={jwtToken}
                  showCopyButton={showCopyButton}
                  copySoapToClipboard={copySoapToClipboard}
                  copySuccess={copySuccess}
                  isGeneratingSoapNote={isGeneratingSoapNote}
                  generateSoapNote={generateSoapNote}
                  isPolling={isPolling}
                />
              )}
            </div>
          )
        }
      </div>
    </div>
  );
}

export default NotesClinical;
