import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CropOverlay } from './components/CropOverlay';
import { analyzeScreen, generateSpeech, EmotionIntensity } from './services/geminiService';
import { CropRegion, LogEntry, ProcessingState } from './types';
import { resizeImageToBase64, getPixelDiff } from './services/imageUtils';

// Icons
const PlayIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PauseIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const StopIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>;
const MonitorIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const DocumentIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const EyeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const WarningIcon = () => <svg className="w-12 h-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const SpeakerIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>;
const SettingsIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const KeyboardIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 18h.01M16 18h.01M12 14h.01M8 14h.01M16 14h.01M12 10h.01M8 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
const ControllerIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;
const TuneIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>;

const POLL_INTERVAL_MS = 1000; // Check more frequently (1s) because smart diff is efficient
const AVAILABLE_GEMINI_VOICES = ['Auto', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

const App: React.FC = () => {
  // State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scriptContext, setScriptContext] = useState<string>("");
  const [scriptName, setScriptName] = useState<string | null>(null);
  const [lastText, setLastText] = useState<string>("");
  const [isAutoMode, setIsAutoMode] = useState<boolean>(false);
  
  // Settings State
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>("");
  const [hotkey, setHotkey] = useState<string>("Backquote"); // Default to `
  const [isRecordingHotkey, setIsRecordingHotkey] = useState<boolean>(false);
  
  // Voice Settings
  const [selectedVoice, setSelectedVoice] = useState<string>("Auto");
  const [thirdPartyApiKey, setThirdPartyApiKey] = useState<string>("");
  const [thirdPartyEndpoint, setThirdPartyEndpoint] = useState<string>("https://api.openai.com/v1/audio/speech");
  const [thirdPartyVoiceId, setThirdPartyVoiceId] = useState<string>("alloy");
  const [thirdPartyModel, setThirdPartyModel] = useState<string>("tts-1");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Modulation State
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [emotionIntensity, setEmotionIntensity] = useState<EmotionIntensity>('Medium');

  // Advanced Settings
  const [bypassVisualCheck, setBypassVisualCheck] = useState<boolean>(false);
  const [visualDiffThreshold, setVisualDiffThreshold] = useState<number>(0.005); // 0.5% default
  const [bypassTextCheck, setBypassTextCheck] = useState<boolean>(false);

  // Permission Modal State
  const [permissionError, setPermissionError] = useState<{show: boolean, message: string}>({ show: false, message: '' });

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Smart Diff Refs
  const lastCropCanvasRef = useRef<HTMLCanvasElement | null>(null); // To store full canvas state for pixel diff
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const autoLoopRef = useRef<NodeJS.Timeout | null>(null);
  
  // Gamepad State
  const gamepadLoopRef = useRef<number | null>(null);
  const lastGamepadButtonState = useRef<boolean>(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Load Audio Devices
  useEffect(() => {
    const getDevices = async () => {
      try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const speakers = devices.filter(d => d.kind === 'audiooutput');
          setAudioOutputDevices(speakers);
          
          if (!selectedSpeakerId && speakers.length > 0) {
              const defaultDevice = speakers.find(d => d.deviceId === 'default');
              setSelectedSpeakerId(defaultDevice ? defaultDevice.deviceId : speakers[0].deviceId);
          }
      } catch (e) {
          console.warn("Error enumerating devices:", e);
      }
    };
    
    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, [selectedSpeakerId]);

  // Cleanup auto loop on unmount or mode change
  useEffect(() => {
    if (isAutoMode) {
      addLog('info', 'Auto-watch mode enabled.');
      // Pass fresh config via closure
      autoLoopRef.current = setInterval(() => processFrame(false), POLL_INTERVAL_MS);
    } else {
      if (autoLoopRef.current) {
        clearInterval(autoLoopRef.current);
        autoLoopRef.current = null;
        addLog('info', 'Auto-watch mode disabled.');
      }
    }
    return () => {
      if (autoLoopRef.current) clearInterval(autoLoopRef.current);
    };
  }, [isAutoMode, stream, cropRegion, bypassVisualCheck, bypassTextCheck, visualDiffThreshold, speechSpeed, emotionIntensity, selectedVoice, thirdPartyApiKey, thirdPartyEndpoint, thirdPartyVoiceId, thirdPartyModel]);

  // Gamepad Polling Loop (Runs always when stream is active)
  useEffect(() => {
    if (!stream) {
      if (gamepadLoopRef.current) cancelAnimationFrame(gamepadLoopRef.current);
      return;
    }

    const checkGamepad = () => {
      const gamepads = navigator.getGamepads();
      if (gamepads[0]) {
        // Check standard 'A' button (index 0) or 'X' button (index 2)
        const isPressed = gamepads[0].buttons[0].pressed || gamepads[0].buttons[2].pressed;
        
        if (isPressed && !lastGamepadButtonState.current) {
           // Button Down
           if (processingState === ProcessingState.IDLE) {
             addLog('info', 'Gamepad trigger detected.');
             ensureAudioContext(true).then(() => processFrame(true));
           }
        }
        lastGamepadButtonState.current = isPressed;
      }
      gamepadLoopRef.current = requestAnimationFrame(checkGamepad);
    };

    gamepadLoopRef.current = requestAnimationFrame(checkGamepad);
    return () => {
      if (gamepadLoopRef.current) cancelAnimationFrame(gamepadLoopRef.current);
    };
  }, [stream, processingState, speechSpeed, emotionIntensity, selectedVoice, thirdPartyApiKey, thirdPartyEndpoint, thirdPartyVoiceId, thirdPartyModel, visualDiffThreshold]);

  // Logging Helper
  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [{ id: Date.now().toString(), timestamp: new Date(), type, message }, ...prev.slice(0, 50)]);
  };

  // Helper to ensure AudioContext is ready.
  const ensureAudioContext = async (interactive: boolean = false) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (selectedSpeakerId && (audioContextRef.current as any).setSinkId) {
          (audioContextRef.current as any).setSinkId(selectedSpeakerId).catch((e: any) => console.warn("Failed to set sinkId on creation:", e));
      }
    }
    
    if (audioContextRef.current.state === 'suspended' && interactive) {
      try {
        await audioContextRef.current.resume();
      } catch (e) {
        console.warn("Failed to resume AudioContext:", e);
      }
    }
    return audioContextRef.current;
  };

  // Handle Speaker Change
  const handleSpeakerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedSpeakerId(deviceId);
    
    if (audioContextRef.current && (audioContextRef.current as any).setSinkId) {
        try {
            await (audioContextRef.current as any).setSinkId(deviceId);
            addLog('info', 'Audio output device updated.');
        } catch (err) {
            console.error(err);
            addLog('error', 'Failed to switch audio output device.');
        }
    }
  };

  // Capture & Process Logic
  const processFrame = async (manualOverride = false) => {
    // If busy, skip this poll tick
    if (!videoRef.current || !canvasRef.current || !cropRegion) return;
    if (processingState !== ProcessingState.IDLE) return;

    setProcessingState(ProcessingState.CAPTURING);
    
    try {
      const vid = videoRef.current;
      const cvs = canvasRef.current;
      const ctx = cvs.getContext('2d');
      
      if (!ctx) {
          setProcessingState(ProcessingState.IDLE);
          return;
      }

      // 1. Capture Cropped Region (Target Box)
      const cropCvs = document.createElement('canvas');
      cropCvs.width = cropRegion.width;
      cropCvs.height = cropRegion.height;
      const cropCtx = cropCvs.getContext('2d');
      
      if (!cropCtx) {
          setProcessingState(ProcessingState.IDLE);
          return;
      }

      cropCtx.drawImage(
        vid, 
        cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height, 
        0, 0, cropRegion.width, cropRegion.height
      );
      
      const croppedBase64 = cropCvs.toDataURL('image/png').split(',')[1];

      // 2. SMART PIXEL DIFF CHECK
      if (!manualOverride && !bypassVisualCheck) {
         const diff = getPixelDiff(
            cropCtx, 
            lastCropCanvasRef.current ? lastCropCanvasRef.current.getContext('2d') : null, 
            cropRegion.width, 
            cropRegion.height
         );

         // Use configured threshold
         if (diff < visualDiffThreshold) {
             setProcessingState(ProcessingState.IDLE);
             return; 
         }
      }

      // Save current crop canvas for next diff
      const savedCrop = document.createElement('canvas');
      savedCrop.width = cropRegion.width;
      savedCrop.height = cropRegion.height;
      savedCrop.getContext('2d')?.drawImage(cropCvs, 0, 0);
      lastCropCanvasRef.current = savedCrop;

      // 3. Capture & Resize Full Frame (Context)
      const fullFrameBase64 = resizeImageToBase64(vid, 800);

      // 4. Send to Gemini Vision
      setProcessingState(ProcessingState.ANALYZING);
      if (manualOverride) addLog('info', 'Scanning frame...');
      
      const result = await analyzeScreen(fullFrameBase64, croppedBase64, scriptContext);
      
      // TEXT DIFF CHECK
      if (!bypassTextCheck && result.text === lastText) {
        if (manualOverride) addLog('info', 'Text unchanged.');
        setProcessingState(ProcessingState.IDLE);
        return;
      }
      
      setLastText(result.text);
      addLog('ai', `Detected: [${result.character}] ${result.text.slice(0, 30)}... (${result.emotion})`);

      if (!result.text || result.text.trim().length === 0) {
        setProcessingState(ProcessingState.IDLE);
        return;
      }

      // 5. Generate Audio
      setProcessingState(ProcessingState.SPEAKING);
      
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch (e) {}
        audioSourceRef.current = null;
      }

      const audioCtx = await ensureAudioContext(manualOverride);
      
      const useThirdParty = selectedVoice === 'ThirdParty';
      const ttsOptions = useThirdParty
         ? { 
             apiKey: thirdPartyApiKey, 
             endpoint: thirdPartyEndpoint,
             model: thirdPartyModel 
           } 
         : undefined;

      const voiceToUse = useThirdParty ? thirdPartyVoiceId : selectedVoice;

      const source = await generateSpeech(
        result.text, 
        result.character, 
        result.emotion, 
        audioCtx,
        voiceToUse,
        ttsOptions,
        { speed: speechSpeed, intensity: emotionIntensity }
      );
      audioSourceRef.current = source;
      
      source.onended = () => {
          if (audioSourceRef.current === source) {
              audioSourceRef.current = null;
          }
      };

      addLog('success', 'Audio playing.');

    } catch (err: any) {
      let message = err.message || 'Processing failed';
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('503')) {
         message = "API Quota/Rate Limit Exceeded. Please wait.";
      }
      addLog('error', message);
    } finally {
      setProcessingState(ProcessingState.IDLE);
    }
  };

  // HOTKEY LISTENER
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRecordingHotkey) {
          e.preventDefault();
          setHotkey(e.code);
          setIsRecordingHotkey(false);
          addLog('info', `Hotkey set to: ${e.code}`);
          return;
      }

      if (e.code === hotkey && stream && processingState === ProcessingState.IDLE) {
          e.preventDefault();
          ensureAudioContext(true).then(() => {
              processFrame(true);
          });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecordingHotkey, hotkey, stream, processingState, videoRef.current, canvasRef.current, cropRegion, lastText, scriptContext, selectedVoice, thirdPartyApiKey, thirdPartyEndpoint, thirdPartyVoiceId, thirdPartyModel, bypassTextCheck, bypassVisualCheck, visualDiffThreshold, speechSpeed, emotionIntensity]);

  // Start Screen Capture
  const startCapture = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setPermissionError({
            show: true,
            message: "Your browser does not support screen sharing. Please try Chrome, Edge, or Firefox on Desktop."
        });
        return;
    }

    navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false 
    }).then((mediaStream) => {
      setStream(mediaStream);
      addLog('success', 'Connected to game window.');
      setPermissionError({ show: false, message: '' }); 

      mediaStream.getVideoTracks()[0].onended = () => {
        setStream(null);
        setIsAutoMode(false);
        addLog('info', 'Screen sharing ended.');
      };
    }).catch((err) => {
      console.error(err);
      let msg = 'Failed to start screen capture.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Permission denied.';
      } 
      setPermissionError({ show: true, message: msg });
      addLog('error', msg);
    });
  };

  const onVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoSize({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScriptName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setScriptContext(text.slice(0, 50000)); 
      addLog('success', `Script loaded: ${file.name}`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-200 font-sans relative">
      
      {/* PERMISSION MODAL */}
      {permissionError.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-gray-900 border border-red-500/50 p-6 rounded-xl max-w-md w-full text-center shadow-2xl">
             <div className="flex justify-center"><WarningIcon /></div>
             <h3 className="text-xl font-bold text-red-400 mb-2">Permission Required</h3>
             <p className="text-gray-300 mb-6">{permissionError.message}</p>
             <div className="flex justify-center gap-3">
                <button onClick={() => setPermissionError({show: false, message: ''})} className="px-4 py-2 text-gray-400 border border-gray-700 rounded">Cancel</button>
                <button onClick={() => startCapture()} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold">Try Again</button>
             </div>
          </div>
        </div>
      )}

      {/* LEFT COLUMN */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden border-r border-gray-800">
        {!stream && (
          <div className="text-center p-10 space-y-4">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">
              RenPy Voiceover Companion
            </h1>
            <p className="text-gray-400 max-w-md mx-auto">
              Hook into your visual novel, define the dialogue box, and let AI voice the characters in real-time.
            </p>
            <button onClick={startCapture} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium shadow-lg shadow-emerald-900/50 transition-all flex items-center gap-2 mx-auto">
              <MonitorIcon /> Select Game Window
            </button>
          </div>
        )}

        {stream && (
          <div className="relative shadow-2xl border border-gray-800 rounded-lg overflow-hidden max-w-full max-h-full">
            <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={onVideoLoadedMetadata} className="max-w-full max-h-screen block object-contain" />
            <canvas ref={canvasRef} className="hidden" />
            {videoSize.width > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                     <div className="pointer-events-auto absolute inset-0">
                         <CropOverlay 
                            containerWidth={videoRef.current?.offsetWidth || 640} 
                            containerHeight={videoRef.current?.offsetHeight || 360}
                            onCropChange={(region) => {
                                const vid = videoRef.current;
                                if (!vid) return;
                                const scaleX = vid.videoWidth / vid.offsetWidth;
                                const scaleY = vid.videoHeight / vid.offsetHeight;
                                setCropRegion({
                                    x: region.x * scaleX,
                                    y: region.y * scaleY,
                                    width: region.width * scaleX,
                                    height: region.height * scaleY
                                });
                            }} 
                         />
                     </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN */}
      <div className="w-80 flex flex-col bg-gray-900 border-l border-gray-800">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
            <h2 className="font-bold text-lg text-emerald-400">Control Deck</h2>
            <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${processingState === ProcessingState.SPEAKING ? 'bg-green-400 animate-ping' : (stream ? 'bg-emerald-600' : 'bg-red-500')}`} />
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                    {processingState === ProcessingState.IDLE ? (isAutoMode ? 'Watching...' : 'Ready') : processingState}
                </span>
            </div>
        </div>

        {/* SETTINGS TOGGLE */}
        <div className="px-4 pt-2">
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
                <SettingsIcon /> {showSettings ? 'Hide Settings' : 'Show Settings'}
            </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* SETTINGS PANEL */}
            {showSettings && (
                <div className="space-y-4 bg-gray-800/30 p-3 rounded-lg border border-gray-700 mb-2 animate-fade-in">
                    {/* Hotkey */}
                    <div>
                        <span className="text-xs text-gray-400 font-semibold uppercase flex items-center gap-2 mb-1">
                            <KeyboardIcon /> Scan Hotkey
                        </span>
                        <div className="space-y-1">
                            <button 
                                onClick={() => setIsRecordingHotkey(true)}
                                className={`w-full text-xs py-2 px-3 rounded border text-center transition-colors
                                    ${isRecordingHotkey 
                                        ? 'bg-red-900/50 border-red-500 text-red-200 animate-pulse' 
                                        : 'bg-gray-900 border-gray-700 text-emerald-400 hover:border-emerald-500'
                                    }
                                `}
                            >
                                {isRecordingHotkey ? "Press any key..." : (hotkey || "None")}
                            </button>
                            <p className="text-[10px] text-gray-500 flex items-start gap-1">
                                <span className="text-yellow-500 mt-0.5">⚠️</span> Only works when app has focus. 
                            </p>
                        </div>
                    </div>

                    {/* Voice Modulation */}
                    <div>
                        <span className="text-xs text-gray-400 font-semibold uppercase flex items-center gap-2 mb-2">
                            <TuneIcon /> Voice Modulation
                        </span>
                        
                        {/* Speed Slider */}
                        <div className="mb-3">
                             <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Speed</span>
                                <span>{speechSpeed.toFixed(1)}x</span>
                             </div>
                             <input 
                                type="range" 
                                min="0.5" max="1.5" step="0.1"
                                value={speechSpeed}
                                onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                             />
                        </div>

                        {/* Intensity Select */}
                        <div>
                             <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Emotion Intensity</span>
                                <span className={emotionIntensity === 'High' ? 'text-orange-400' : ''}>{emotionIntensity}</span>
                             </div>
                             <div className="flex bg-gray-900 rounded border border-gray-700 p-0.5">
                                {(['Low', 'Medium', 'High'] as EmotionIntensity[]).map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setEmotionIntensity(level)}
                                        className={`flex-1 text-[10px] py-1 rounded transition-colors ${
                                            emotionIntensity === level 
                                                ? 'bg-emerald-600 text-white font-bold shadow' 
                                                : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                             </div>
                        </div>
                    </div>

                    {/* Voice Model Selection */}
                    <div>
                        <span className="text-xs text-gray-400 font-semibold uppercase mb-1 block">
                            Voice Selection
                        </span>
                        <select 
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="w-full bg-gray-900 text-xs text-gray-300 border border-gray-700 rounded p-2 focus:border-emerald-500 outline-none"
                        >
                            {AVAILABLE_GEMINI_VOICES.map(v => (
                                <option key={v} value={v}>Gemini: {v}</option>
                            ))}
                            <option value="ThirdParty">Custom API (OpenAI/Other)</option>
                        </select>
                    </div>

                    {/* Third Party API */}
                    {selectedVoice === 'ThirdParty' && (
                        <div className="pt-2 border-t border-gray-700 animate-fade-in">
                             <span className="text-xs text-gray-400 font-semibold uppercase mb-1 block">
                                Third-Party Configuration
                            </span>
                            <input 
                                type="password"
                                placeholder="API Key (Optional for local)"
                                value={thirdPartyApiKey}
                                onChange={(e) => setThirdPartyApiKey(e.target.value)}
                                className="w-full bg-gray-900 text-xs text-gray-300 border border-gray-700 rounded p-2 mb-2 focus:border-emerald-500 outline-none"
                            />
                            <input 
                                type="text"
                                placeholder="Endpoint URL"
                                value={thirdPartyEndpoint}
                                onChange={(e) => setThirdPartyEndpoint(e.target.value)}
                                className="w-full bg-gray-900 text-xs text-gray-500 border border-gray-700 rounded p-2 mb-2 focus:border-emerald-500 outline-none"
                            />
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text"
                                    placeholder="Model (e.g. tts-1)"
                                    value={thirdPartyModel}
                                    onChange={(e) => setThirdPartyModel(e.target.value)}
                                    className="flex-1 bg-gray-900 text-xs text-gray-300 border border-gray-700 rounded p-2 focus:border-emerald-500 outline-none"
                                />
                                <input 
                                    type="text"
                                    placeholder="Voice ID (e.g. alloy)"
                                    value={thirdPartyVoiceId}
                                    onChange={(e) => setThirdPartyVoiceId(e.target.value)}
                                    className="flex-1 bg-gray-900 text-xs text-gray-300 border border-gray-700 rounded p-2 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">
                                Compatible with OpenAI-style /v1/audio/speech endpoints.
                            </p>
                        </div>
                    )}

                    {/* Audio Output */}
                    {audioOutputDevices.length > 0 && (
                        <div>
                            <span className="text-xs text-gray-400 font-semibold uppercase flex items-center gap-2 mb-1">
                                <SpeakerIcon /> Audio Output
                            </span>
                            <select 
                                value={selectedSpeakerId} 
                                onChange={handleSpeakerChange}
                                className="w-full bg-gray-900 text-xs text-gray-300 border border-gray-700 rounded p-2 focus:border-emerald-500 outline-none"
                            >
                                {audioOutputDevices.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Speaker ${device.deviceId.slice(0,5)}...`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Gamepad Info */}
                    <div>
                        <span className="text-xs text-gray-400 font-semibold uppercase flex items-center gap-2 mb-1">
                            <ControllerIcon /> Controller Support
                        </span>
                        <p className="text-[10px] text-gray-500">
                            Press <b>'A'</b> or <b>'X'</b> on a connected gamepad to scan while the game is focused.
                        </p>
                    </div>

                    {/* Advanced Scan Options */}
                    <div>
                        <span className="text-xs text-gray-400 font-semibold uppercase flex items-center gap-2 mb-2">
                            Advanced Scan Options
                        </span>
                        <div className="mb-2">
                             <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Visual Change Threshold</span>
                                <span>{(visualDiffThreshold * 100).toFixed(1)}%</span>
                             </div>
                             <input 
                                type="range" 
                                min="0.001" max="0.05" step="0.001"
                                value={visualDiffThreshold}
                                onChange={(e) => setVisualDiffThreshold(parseFloat(e.target.value))}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                             />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-gray-300 mb-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={bypassVisualCheck}
                                onChange={(e) => setBypassVisualCheck(e.target.checked)}
                                className="w-3 h-3 accent-emerald-500"
                            />
                            Bypass Visual Cache (Always OCR)
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={bypassTextCheck}
                                onChange={(e) => setBypassTextCheck(e.target.checked)}
                                className="w-3 h-3 accent-emerald-500"
                            />
                            Bypass Text Cache (Always Narrate)
                        </label>
                        <p className="text-[10px] text-gray-500 mt-1 italic">
                           Checks are optimized. Disable "Bypass" for best performance.
                        </p>
                    </div>

                </div>
            )}

            {/* Standard Controls */}
            <button
                onClick={async () => {
                    await ensureAudioContext(true);
                    setIsAutoMode(!isAutoMode);
                }}
                disabled={!stream}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all border
                    ${!stream 
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed border-transparent' 
                        : isAutoMode
                            ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                    }
                `}
            >
                {isAutoMode ? <><EyeIcon /> Watching Screen</> : <><PlayIcon /> Start Watching</>}
            </button>

            <button
                onClick={async () => {
                    await ensureAudioContext(true);
                    processFrame(true);
                }}
                disabled={!stream || processingState !== ProcessingState.IDLE}
                className={`w-full py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all
                    ${!stream 
                        ? 'text-gray-700 cursor-not-allowed' 
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'
                    }
                `}
            >
                Scan Single Frame ({hotkey})
            </button>

            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <label className="flex flex-col gap-2 cursor-pointer group">
                    <span className="text-xs text-gray-400 font-semibold uppercase flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
                        <DocumentIcon />
                        {scriptName ? 'Replace Script' : 'Load Game Script (.txt)'}
                    </span>
                    <input type="file" accept=".txt,.rpa,.rpy" onChange={handleFileUpload} className="hidden" />
                    <div className="text-xs text-gray-500 truncate">
                        {scriptName || "No script loaded for context"}
                    </div>
                </label>
            </div>
            
            <div className="text-xs text-gray-500 italic px-2">
                {isAutoMode 
                    ? "AI is watching the target area. Voice generates when text changes."
                    : "Drag the green box over the dialogue text. Click 'Start Watching' to begin."
                }
            </div>
        </div>

        {/* Logs / Transcript */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
            {logs.length === 0 && <div className="text-gray-600 text-center text-sm mt-10">System logs will appear here</div>}
            {logs.map(log => (
                <div key={log.id} className="text-sm animate-fade-in">
                    <div className="flex items-baseline justify-between mb-1">
                        <span className={`text-xs font-bold uppercase tracking-wide
                            ${log.type === 'error' ? 'text-red-500' : ''}
                            ${log.type === 'success' ? 'text-green-500' : ''}
                            ${log.type === 'ai' ? 'text-purple-400' : ''}
                            ${log.type === 'info' ? 'text-blue-400' : ''}
                        `}>
                            {log.type === 'ai' ? 'AI Analysis' : log.type}
                        </span>
                        <span className="text-[10px] text-gray-600">
                            {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                        </span>
                    </div>
                    <div className={`
                        p-2 rounded border-l-2
                        ${log.type === 'error' ? 'bg-red-900/10 border-red-500 text-red-200' : ''}
                        ${log.type === 'success' ? 'bg-green-900/10 border-green-500 text-gray-300' : ''}
                        ${log.type === 'ai' ? 'bg-purple-900/10 border-purple-500 text-gray-200 italic' : ''}
                        ${log.type === 'info' ? 'bg-blue-900/10 border-blue-500 text-gray-400' : ''}
                    `}>
                        {log.message}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default App;