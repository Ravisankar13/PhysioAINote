import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function CameraTest() {
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [streamInfo, setStreamInfo] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const testCamera = async () => {
    try {
      setCameraStatus('requesting');
      setErrorMessage('');
      
      console.log('Testing camera access...');
      console.log('Secure context:', window.isSecureContext);
      console.log('Protocol:', window.location.protocol);
      console.log('Hostname:', window.location.hostname);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false 
      });
      
      console.log('Stream obtained:', stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        console.log('Video track settings:', settings);
        
        setStreamInfo({
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          deviceId: settings.deviceId,
          facingMode: settings.facingMode
        });
        
        setCameraStatus('active');
      }
    } catch (error: any) {
      console.error('Camera test failed:', error);
      setCameraStatus('error');
      
      if (error.name === 'NotAllowedError') {
        setErrorMessage('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('No camera found. Please ensure a camera is connected.');
      } else if (error.name === 'NotReadableError') {
        setErrorMessage('Camera is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        setErrorMessage('Camera does not support the requested constraints.');
      } else if (error.name === 'TypeError') {
        setErrorMessage('Invalid constraints or browser compatibility issue.');
      } else {
        setErrorMessage(error.message || 'Unknown error occurred');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setCameraStatus('idle');
      setStreamInfo(null);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Test Page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Secure Context:</strong> {window.isSecureContext ? 'Yes ✓' : 'No ✗'}
            </div>
            <div>
              <strong>Protocol:</strong> {window.location.protocol}
            </div>
            <div>
              <strong>getUserMedia Support:</strong> {(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ? 'Yes ✓' : 'No ✗'}
            </div>
            <div>
              <strong>Status:</strong> 
              <span className={`ml-2 ${
                cameraStatus === 'active' ? 'text-green-600' : 
                cameraStatus === 'error' ? 'text-red-600' : 
                cameraStatus === 'requesting' ? 'text-yellow-600' : 
                'text-gray-600'
              }`}>
                {cameraStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {streamInfo && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Camera active: {streamInfo.width}x{streamInfo.height} @ {streamInfo.frameRate}fps
                {streamInfo.facingMode && ` (${streamInfo.facingMode} facing)`}
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={testCamera} 
              disabled={cameraStatus === 'active' || cameraStatus === 'requesting'}
            >
              {cameraStatus === 'requesting' ? 'Requesting...' : 'Test Camera'}
            </Button>
            <Button 
              onClick={stopCamera} 
              variant="secondary"
              disabled={cameraStatus !== 'active'}
            >
              Stop Camera
            </Button>
          </div>

          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {!window.isSecureContext && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Warning:</strong> Camera access requires HTTPS or localhost. 
                You're currently on {window.location.protocol}//{window.location.host}. 
                For production deployment, ensure you're using HTTPS.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}