import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'wouter';
import { Camera, CameraOff, RefreshCw, Wifi, WifiOff, Smartphone } from 'lucide-react';

export default function PhoneCameraPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId || '';
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [desktopConnected, setDesktopConnected] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState('');
  const [region, setRegion] = useState('');
  const [framesSent, setFramesSent] = useState(0);

  const connectWebSocket = useCallback(() => {
    if (!roomId) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/phone-camera?room=${roomId}&role=phone`);

    ws.onopen = () => {
      setIsConnected(true);
      setError('');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'desktop-connected') {
          setDesktopConnected(true);
        } else if (msg.type === 'desktop-disconnected') {
          setDesktopConnected(false);
        } else if (msg.type === 'region-change') {
          setRegion(msg.region || '');
        }
      } catch {}
    };

    ws.onclose = () => {
      setIsConnected(false);
      setDesktopConnected(false);
      setTimeout(() => {
        if (wsRef.current === ws) {
          connectWebSocket();
        }
      }, 3000);
    };

    ws.onerror = () => {
      setError('Connection failed. Check the room code.');
    };

    wsRef.current = ws;
  }, [roomId]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  const startCamera = useCallback(async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);

      if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const canvas = canvasRef.current;
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

        wsRef.current.send(JSON.stringify({ type: 'frame', image: dataUrl, timestamp: Date.now() }));
        setFramesSent(prev => prev + 1);
      }, 200);
    } catch (err: any) {
      setError(err.message || 'Failed to access camera');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const switchCamera = useCallback(() => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    if (isStreaming) {
      stopCamera();
      setTimeout(() => startCamera(), 300);
    }
  }, [facingMode, isStreaming, stopCamera, startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const regionLabels: Record<string, string> = {
    right_ankle: 'Right Ankle', left_ankle: 'Left Ankle',
    right_knee: 'Right Knee', left_knee: 'Left Knee',
    right_hip: 'Right Hip', left_hip: 'Left Hip',
    right_shoulder: 'Right Shoulder', left_shoulder: 'Left Shoulder',
    right_elbow: 'Right Elbow', left_elbow: 'Left Elbow',
    cervical_spine: 'Neck / Cervical', lumbar_spine: 'Low Back / Lumbar',
    right_leg: 'Right Leg (Full)', left_leg: 'Left Leg (Full)',
    full_body: 'Full Body',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-cyan-400" />
            <span className="font-bold text-lg">PhysioGPT Camera</span>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="flex items-center gap-1 text-green-400 text-sm">
                <Wifi className="h-4 w-4" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-400 text-sm">
                <WifiOff className="h-4 w-4" /> Disconnected
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
          <span>Room: <span className="text-cyan-400 font-mono font-bold">{roomId}</span></span>
          {desktopConnected && <span className="text-green-400">Desktop linked</span>}
          {region && region !== 'full_body' && (
            <span className="bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded">
              Focus: {regionLabels[region] || region}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />

        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900">
            <Camera className="h-16 w-16 text-slate-600" />
            <p className="text-slate-400 text-center px-8">
              {region && region !== 'full_body'
                ? `Point your camera at the patient's ${regionLabels[region] || region}`
                : 'Point your camera at the area to examine'}
            </p>
            <p className="text-slate-500 text-xs text-center px-8">
              Use the rear camera for best results when examining specific body parts
            </p>
          </div>
        )}

        {isStreaming && (
          <div className="absolute top-3 left-3 bg-black/60 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-white">LIVE</span>
            <span className="text-xs text-slate-400">{framesSent} frames</span>
          </div>
        )}

        {region && region !== 'full_body' && isStreaming && (
          <div className="absolute top-3 right-3 bg-cyan-500/20 border border-cyan-500/50 rounded-lg px-3 py-1.5">
            <span className="text-xs text-cyan-300 font-medium">
              Focus: {regionLabels[region] || region}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border-t border-red-700 px-4 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-slate-900 border-t border-slate-700 px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={switchCamera}
            className="bg-slate-700 hover:bg-slate-600 rounded-full p-3 transition-colors"
          >
            <RefreshCw className="h-6 w-6 text-white" />
          </button>

          <button
            onClick={isStreaming ? stopCamera : startCamera}
            className={`rounded-full p-5 transition-colors ${
              isStreaming
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-cyan-600 hover:bg-cyan-500'
            }`}
          >
            {isStreaming ? (
              <CameraOff className="h-8 w-8 text-white" />
            ) : (
              <Camera className="h-8 w-8 text-white" />
            )}
          </button>

          <div className="bg-slate-700 rounded-full p-3">
            <span className="text-xs text-slate-300 font-mono">
              {facingMode === 'environment' ? 'REAR' : 'FRONT'}
            </span>
          </div>
        </div>

        {!desktopConnected && isConnected && (
          <p className="text-center text-amber-400 text-xs mt-3">
            Waiting for desktop to connect...
          </p>
        )}

        {!isConnected && (
          <p className="text-center text-red-400 text-xs mt-3">
            Connecting to room {roomId}...
          </p>
        )}
      </div>
    </div>
  );
}
