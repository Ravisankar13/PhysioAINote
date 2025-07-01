import React, { useState, useEffect, useRef, useDebugValue } from "react";
import { useLocation } from "wouter";
import axios from "axios";
import * as lame from "@breezystack/lamejs";
import "./NotesClinical.css"; // Import the CSS file
// import { FaBars } from 'react-icons/fa';
import { FaBars, FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import TranscriptionTable from "../components/notes-clinical/Transcription";
import PatientDataForm from "../components/notes-clinical/PatientDataForm";
import SoapNote from "../components/notes-clinical/SoapSection";
import SoapSummary from "../components/notes-clinical/SoapSummary";

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
  goals?: string;
  treatment?: string;
  status?: string;
}

interface SoapSummaries {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  goals?: string;
  treatment?: string;
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
  const [soapSummaries, setSoapSummaries] = useState<SoapSummaries>({});
  const [isGeneratingSoapNote, setIsGeneratingSoapNote] =
    useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingStatus, setStreamingStatus] = useState<
    Record<string, { isStreaming: boolean; isComplete: boolean }>
  >({});

  const [location, setLocation] = useLocation();
  const soap_note_streaming_api_base_url = 'https://api.physioconversation.stackaisolutions.com'

  useEffect(() => {
    const handleLogin = async () => {
      try {
        const response = await fetch(
          "https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/get-auth-token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username: "anup", password: "anup123" }),
          }
        );

        if (!response.ok) {
          throw new Error("Login failed");
        }

        const data = await response.json();
        const token = data.token;
        const userId = data.user_id;
        if (token) {
          setJwtToken(token);
          setUserId(userId);
          setIsLoading(false);
        } else {
          console.error("Token not found in response");
        }
      } catch (error) {
        console.error("Error during login:", error);
      }
    };
    handleLogin();
  }, []);

  const fetchSessions = async (lastKey?: string) => {
    try {
      let url = `https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/session/get-all`;
      // if (lastKey)
      //   url = `https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/session/get-all?limit=${limit}&last_key=${lastKey}`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();

        const sessions_list = data.sessions;
        // Assuming data is a list of session objects
        const formattedSessions = sessions_list.map(
          (session: any, index: number) => ({
            id: session.session_id ? session.session_id : session.pk,
            name: session.session_name,
            user_id: session.user_id,
          })
        );

        setLastKey(data.last_key);

        setSessions(formattedSessions);
      } else {
        console.error("Failed to fetch sessions:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  useEffect(() => {
    if (jwtToken) {
      fetchSessions();

      // Reset the editingSessionSaved state if it was true
      if (editingSessionSaved) {
        setEditingSessionSaved(false);
      }
    }
  }, [jwtToken, editingSessionSaved]);

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

      await axios.put(
        `https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/session/update?id=${sessionId}`,
        { session_name: newSessionName },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
          },
        }
      );
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
      const response = await fetch(
        `https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/session/get?id=${sessionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Map response data to patientData structure
        setPatientData({
          firstname: data.firstname || "",
          middlename: data.middlename || "",
          lastname: data.lastname || "",
          gender: data.gender || "",
          dob: data.dob || "",
          weight: data.weight || "",
          height_feet: data.height_feet || "",
          height_inch: data.height_inch || "",
          pastMedicalHistory: data.pastMedicalHistory || "",
          pastSurgicalHistory: data.pastSurgicalHistory || "",
        });

        setTranscriptPreSIgnedURL(data.transcript_presigned_url);
        let soapNoteResponse: SoapNoteData | false = false;
        if (data?.soap_note?.subjective) {
          soapNoteResponse = data.soap_note as SoapNoteData;
        } else {
          let parsedNote = data?.soap_note;
          parsedNote = parsedNote ? JSON.parse(parsedNote) : false;
          soapNoteResponse = parsedNote;
        }
        setSoapNote(soapNoteResponse);
        if (soapNoteResponse) {
          setShowCopyButton(true);
        }
        setShowTranscript(true);
        setSessionId(data.session_id ? data.session_id : data.pk);

        // Fetch SOAP summaries if SOAP note is completed
        if (soapNoteResponse && soapNoteResponse.status === "completed") {
          fetchSoapSummaries(data.session_id ? data.session_id : data.pk, userId || undefined);
        }
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
    setSoapSummaries({});
    setShowTranscript(false);
    setRecordTime(0);
    setAudioBlob(null);
    setIsStreaming(false);
    setStreamingStatus({});
  };

  const uploadDemographicData = async (): Promise<void> => {
    if (!jwtToken || !userId) {
      console.error("JWT token or user ID not found");
      return;
    }

    try {
      
      await axios.post(
        // "https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/save-demographic-data",
        `${soap_note_streaming_api_base_url}/save-demographic-data`,
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

    // Check if this is a new session (use streaming) or existing session (use polling)
    const isNewSession = !soapNote || (soapNote && soapNote.status === "pending");
    
    if (isNewSession) {
      // Use streaming for new SOAP note generation
      streamSoapNoteGeneration();
      // TODO: Add another method for integrating API to get each SOAP Section Summary and then show it One new Card with Soap Section as heading.
    } else {
      // Use existing polling logic for completed sessions
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
          goals: "",
          treatment: "",
          status: "pending",
        };
        setSoapNote(emptySoapNote);
        setIsPolling(true);
        pollSoapNote();
      } catch (error) {
        console.error("Error generating SOAP note:", error);
      }
    }
    setIsGeneratingSoapNote(false);
  };

  const streamSoapNoteGeneration = async (): Promise<void> => {
    if (!jwtToken || !userId || !sessionId) {
      console.error("Missing required data for streaming");
      return;
    }

    try {
      setIsStreaming(true);
      setStreamingStatus({});
      
      // Initialize empty SOAP note for streaming
      const emptySoapNote: SoapNoteData = {
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        goals: "",
        treatment: "",
        status: "in_progress",
      };
      setSoapNote(emptySoapNote);

      // Use the streaming endpoint
      const response = await fetch(
        `${soap_note_streaming_api_base_url}/gen-soap-note-stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...patientData,
            user_id: userId,
            transcript_s3_uri: `s3://physio-convo-data/${sessionId}/transcript.csv`,
            session_id: sessionId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      let buffer = "";
      
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.trim() === "") continue;
          
          if (line.startsWith("data: ")) {
            try {
              const jsonData = line.slice(6).trim();
              if (jsonData === "[DONE]") continue;
              
              const data = JSON.parse(jsonData);
              handleStreamEvent(data);
            } catch (e) {
              console.warn("Failed to parse streaming data:", line, e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error streaming SOAP note:", error);
      setIsStreaming(false);
    }
  };

  const handleStreamEvent = (data: any) => {
    const { type, section, content, message } = data;
    
    switch (type) {
      case "status":
        console.log("Status:", message);
        break;
        
      case "section_start":
        setStreamingStatus(prev => ({
          ...prev,
          [section]: { isStreaming: true, isComplete: false }
        }));
        break;
        
      case "content_delta":
        if (section && content) {
          setSoapNote(prev => {
            if (!prev) {
              return {
                subjective: "",
                objective: "",
                assessment: "",
                plan: "",
                goals: "",
                treatment: "",
                status: "in_progress",
                [section]: content
              };
            }
            return {
              ...prev,
              [section]: (prev[section as keyof SoapNoteData] || "") + content
            };
          });
        }
        break;
        
      case "section_complete":
        if (section) {
          setStreamingStatus(prev => ({
            ...prev,
            [section]: { isStreaming: false, isComplete: true }
          }));
          
          if (content) {
            setSoapNote(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                [section]: content
              };
            });
          }
        }
        break;
        
      case "complete":
        setIsStreaming(false);
        setShowCopyButton(true);
        setSoapNote(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            status: "completed"
          };
        });
        console.log("SOAP note generation completed");
        
        // Fetch SOAP summaries after completion
        if (sessionId) {
          fetchSoapSummaries(sessionId, userId || undefined);
        }
        break;
        
      case "error":
        console.error("Streaming error:", message);
        setIsStreaming(false);
        break;
        
      default:
        console.log("Unknown event type:", type, data);
        break;
    }
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
          
          // Fetch SOAP summaries after completion
          if (sessionId) {
            fetchSoapSummaries(sessionId, userId || undefined);
          }
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

  const fetchSoapSummaries = async (sessionId: string, userId?: string): Promise<void> => {
    try {
      const response = await axios.post(
        `${soap_note_streaming_api_base_url}/soap-note-summary`,
        {
          session_id: sessionId,
          user_id: userId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.summaries) {
        setSoapSummaries(response.data.summaries);
        console.log("SOAP summaries fetched successfully:", response.data.summaries);
      }
    } catch (error) {
      console.error("Error fetching SOAP summaries:", error);
      // Don't show alert for summary errors as it's not critical
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

    try {
      if (!jwtToken) {
        throw new Error("No JWT token found in localStorage");
      }

      const fileName = `audio_${crypto.randomUUID()}.mp3`;

      // Step 1: Get pre-signed URL and session ID from backend.
      const getPresignedUrlRes = await fetch(
        `https://hqy44mb8l7.execute-api.us-east-2.amazonaws.com/dev/get-upload-link?filename=${encodeURIComponent(
          fileName
        )}&contentType=${encodeURIComponent("audio/mpeg")}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      if (!getPresignedUrlRes.ok) {
        throw new Error(
          `Error getting pre-signed URL: ${getPresignedUrlRes.statusText}`
        );
      }

      const { url: presignedUrl, session_id: sessionId } =
        await getPresignedUrlRes.json();

      // Set sessionId state immediately
      setSessionId(sessionId);

      // Step 2: Upload audio directly to AWS S3 using the pre-signed URL.
      const s3UploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "audio/mpeg",
        },
        body: audioBlob,
      });

      if (!s3UploadRes.ok) {
        setUploadingAudio(false);
        throw new Error(`S3 upload failed: ${s3UploadRes.statusText}`);
      }

      setUploadingAudio(false);
      setShowTranscript(true);
      setTranscriptLoading(true);

      //  'https://k6hemfjxttb3goes46y2af2ocm0vmmgm.lambda-url.us-east-2.on.aws/gen-transcript
      // Step 3: After successful upload, request transcript generation, sending just session_id.
      const transcriptRes = await fetch(
        "https://k6hemfjxttb3goes46y2af2ocm0vmmgm.lambda-url.us-east-2.on.aws/gen-transcript",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ session_id: sessionId, user_id: userId }),
        }
      );

      if (!transcriptRes.ok) {
        throw new Error(
          `Transcript generation request failed: ${transcriptRes.statusText}`
        );
      }

      const transcriptData = await transcriptRes.json();

      // Step 4: Set received transcript data into react states.
      setTranscript(transcriptData.transcript_s3_uri);
      setTranscriptPreSIgnedURL(transcriptData.presigned_url);
      setTranscriptLoading(false);

      // Optionally upload demographic data
      uploadDemographicData();

      // Update sessions and current selection
      const newSessionName =
        transcriptData.session_name || `Session ${new Date().toLocaleString()}`;
      const newSession: Session = {
        id: sessionId,
        name: newSessionName,
        user_id: userId,
      };

      setSessions((prevSessions) => [newSession, ...prevSessions]);
      setSelectedSession(sessionId);
    } catch (error) {
      console.error("Error uploading audio:", error);
      setTranscriptLoading(false);
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
            {/* <ul>
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

            <div className="pagination-controls">
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
                  isStreaming={isStreaming}
                  streamingStatus={streamingStatus}
                />
              )}

              {/* SOAP Summary Card - Only show if SOAP note is completed and summaries exist */}
              <SoapSummary
                summaries={soapSummaries}
                isVisible={soapNote !== false && soapNote?.status === "completed" && Object.keys(soapSummaries).length > 0}
              />
            </div>
          )
        }
      </div>
    </div>
  );
}

export default NotesClinical;
