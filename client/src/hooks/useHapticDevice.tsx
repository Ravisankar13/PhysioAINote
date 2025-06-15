import { useState, useEffect, useCallback, useRef } from 'react';

interface HapticDevice {
  id: string;
  name: string;
  connected: boolean;
  capabilities: {
    vibration: boolean;
    force: boolean;
    temperature: boolean;
  };
}

interface HapticFeedback {
  force: number; // 0-1 intensity
  duration: number; // milliseconds
  pattern: 'pulse' | 'continuous' | 'wave';
  frequency?: number; // Hz for vibration
}

export function useHapticDevice() {
  const [device, setDevice] = useState<HapticDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const gamepadRef = useRef<Gamepad | null>(null);
  const vibrationRef = useRef<number | null>(null);

  // Check for gamepad support (basic haptic fallback)
  const checkGamepadSupport = useCallback(() => {
    if ('getGamepads' in navigator) {
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (gamepad && gamepad.vibrationActuator) {
          gamepadRef.current = gamepad;
          setDevice({
            id: `gamepad-${i}`,
            name: gamepad.id,
            connected: true,
            capabilities: {
              vibration: true,
              force: false,
              temperature: false
            }
          });
          setIsConnected(true);
          return true;
        }
      }
    }
    return false;
  }, []);

  // Check for WebUSB haptic devices
  const checkWebUSBSupport = useCallback(async () => {
    if ('usb' in navigator) {
      try {
        // This would be expanded for specific haptic device vendors
        const devices = await navigator.usb.getDevices();
        // Implementation would filter for known haptic device vendor IDs
        return devices.length > 0;
      } catch (error) {
        console.log('WebUSB not available or permission denied');
        return false;
      }
    }
    return false;
  }, []);

  // Initialize haptic device detection
  useEffect(() => {
    const initializeHaptics = async () => {
      // Try WebUSB first for professional haptic devices
      const hasUSBDevice = await checkWebUSBSupport();
      if (!hasUSBDevice) {
        // Fallback to gamepad vibration
        checkGamepadSupport();
      }
    };

    initializeHaptics();

    // Listen for gamepad connections
    const handleGamepadConnected = (e: GamepadEvent) => {
      if (e.gamepad.vibrationActuator) {
        gamepadRef.current = e.gamepad;
        setDevice({
          id: `gamepad-${e.gamepad.index}`,
          name: e.gamepad.id,
          connected: true,
          capabilities: {
            vibration: true,
            force: false,
            temperature: false
          }
        });
        setIsConnected(true);
      }
    };

    const handleGamepadDisconnected = () => {
      gamepadRef.current = null;
      setDevice(null);
      setIsConnected(false);
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      if (vibrationRef.current) {
        clearTimeout(vibrationRef.current);
      }
    };
  }, [checkGamepadSupport, checkWebUSBSupport]);

  // Apply haptic feedback
  const applyFeedback = useCallback(async (feedback: HapticFeedback) => {
    if (!isConnected || !device) return;

    try {
      if (gamepadRef.current?.vibrationActuator) {
        const actuator = gamepadRef.current.vibrationActuator;
        
        switch (feedback.pattern) {
          case 'pulse':
            // Create pulsing effect
            for (let i = 0; i < 3; i++) {
              await actuator.playEffect('dual-rumble', {
                duration: feedback.duration / 3,
                strongMagnitude: feedback.force,
                weakMagnitude: feedback.force * 0.5
              });
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            break;
            
          case 'wave':
            // Create wave-like increasing intensity
            const steps = 10;
            for (let i = 0; i < steps; i++) {
              const intensity = (Math.sin((i / steps) * Math.PI) * feedback.force);
              await actuator.playEffect('dual-rumble', {
                duration: feedback.duration / steps,
                strongMagnitude: intensity,
                weakMagnitude: intensity * 0.5
              });
            }
            break;
            
          case 'continuous':
          default:
            await actuator.playEffect('dual-rumble', {
              duration: feedback.duration,
              strongMagnitude: feedback.force,
              weakMagnitude: feedback.force * 0.5
            });
            break;
        }
      }
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }, [isConnected, device]);

  // Calibrate device for user's grip strength and sensitivity
  const calibrateDevice = useCallback(async () => {
    if (!isConnected) return false;

    try {
      // Basic calibration sequence
      await applyFeedback({ force: 0.3, duration: 200, pattern: 'pulse' });
      await new Promise(resolve => setTimeout(resolve, 500));
      await applyFeedback({ force: 0.6, duration: 200, pattern: 'pulse' });
      await new Promise(resolve => setTimeout(resolve, 500));
      await applyFeedback({ force: 1.0, duration: 200, pattern: 'pulse' });
      
      setIsCalibrated(true);
      return true;
    } catch (error) {
      console.error('Calibration failed:', error);
      return false;
    }
  }, [isConnected, applyFeedback]);

  // Connect to specific haptic device
  const connectDevice = useCallback(async () => {
    if ('usb' in navigator) {
      try {
        const device = await navigator.usb.requestDevice({
          filters: [
            // Add vendor IDs for haptic devices like Force Dimension, SensAble, etc.
            { vendorId: 0x1234 }, // Example vendor ID
          ]
        });
        
        await device.open();
        // Device-specific initialization would go here
        
        setDevice({
          id: device.serialNumber || 'usb-device',
          name: device.productName || 'Haptic Device',
          connected: true,
          capabilities: {
            vibration: true,
            force: true,
            temperature: false
          }
        });
        setIsConnected(true);
        return true;
      } catch (error) {
        console.error('Failed to connect haptic device:', error);
        // Fallback to gamepad detection
        return checkGamepadSupport();
      }
    }
    return checkGamepadSupport();
  }, [checkGamepadSupport]);

  // Disconnect device
  const disconnectDevice = useCallback(() => {
    if (vibrationRef.current) {
      clearTimeout(vibrationRef.current);
    }
    gamepadRef.current = null;
    setDevice(null);
    setIsConnected(false);
    setIsCalibrated(false);
  }, []);

  return {
    device,
    isConnected,
    isCalibrated,
    connectDevice,
    disconnectDevice,
    calibrateDevice,
    applyFeedback
  };
}