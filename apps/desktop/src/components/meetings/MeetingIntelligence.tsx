import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Mic,
  Upload,
  FileAudio,
  Loader2,
  Sparkles,
  CheckCircle,
  DollarSign,
  Users,
  Clock,
  Brain,
  ListTodo,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Mail,
  Square,
  ChevronDown,
  ChevronUp,
  Radio,
  AudioWaveform,
  Copy,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  quickTranscribeAndAnalyze,
  analyzeText,
  calculateMeetingCost,
  getPeriodMeetingCost,
  type MeetingAnalysis,
  type MeetingCostResult,
} from '@/lib/api/meetings';

// ============================================================================
// Main Component
// ============================================================================

export default function MeetingIntelligence() {
  const [activeTab, setActiveTab] = useState<'live' | 'transcribe' | 'analyze' | 'cost'>('live');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
        {[
          { id: 'live', label: 'Live Transcription', icon: Radio },
          { id: 'transcribe', label: 'Upload & Analyze', icon: Upload },
          { id: 'analyze', label: 'Analyze Notes', icon: Brain },
          { id: 'cost', label: 'Meeting Cost', icon: DollarSign },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <LiveTranscriptionTab onAnalyze={() => setActiveTab('analyze')} />
          </motion.div>
        )}
        {activeTab === 'transcribe' && (
          <motion.div
            key="transcribe"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <TranscribeTab />
          </motion.div>
        )}
        {activeTab === 'analyze' && (
          <motion.div
            key="analyze"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AnalyzeNotesTab />
          </motion.div>
        )}
        {activeTab === 'cost' && (
          <motion.div
            key="cost"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <CostCalculatorTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Live Transcription Tab
// ============================================================================

interface TranscriptSegment {
  text: string;
  speaker: number | null;
  isFinal: boolean;
  timestamp: string;
}

function LiveTranscriptionTab({ onAnalyze }: { onAnalyze: () => void }) {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [_isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [_sessionId, setSessionId] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [speakers, setSpeakers] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [finalResult, setFinalResult] = useState<{
    transcript: string;
    durationSeconds: number;
    wordCount: number;
    speakers: number;
    cost: number;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [currentTranscript, interimText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const connectWebSocket = useCallback(() => {
    // Connect to WebSocket - derive from API URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/transcribe';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Start session
      ws.send(JSON.stringify({
        type: 'start',
        meeting_title: meetingTitle || 'Live Meeting',
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'session_started') {
        setSessionId(data.session_id);
        toast.success('Live transcription started!');
      } else if (data.type === 'transcript') {
        if (data.is_final) {
          // Final transcript - add to main transcript
          setCurrentTranscript(prev => prev + (prev ? ' ' : '') + data.text);
          setInterimText('');
          setSegments(prev => [...prev, {
            text: data.text,
            speaker: data.speaker,
            isFinal: true,
            timestamp: new Date().toISOString(),
          }]);
        } else {
          // Interim result
          setInterimText(data.text);
        }
        setWordCount(data.word_count || 0);
        setSpeakers(data.speakers || []);
      } else if (data.type === 'session_ended') {
        const result = data.result;
        setFinalResult({
          transcript: result.transcript,
          durationSeconds: result.duration_seconds,
          wordCount: result.word_count,
          speakers: result.speakers_detected,
          cost: result.api_cost,
        });
        toast.success('Transcription complete!');
      } else if (data.type === 'error') {
        toast.error(data.error);
      }
    };

    ws.onerror = () => {
      toast.error('WebSocket connection error');
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsRecording(false);
    };

    return ws;
  }, [meetingTitle]);

  const startRecording = async () => {
    try {
      // Connect WebSocket first
      const ws = connectWebSocket();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => {
          setIsConnected(true);
          ws.send(JSON.stringify({
            type: 'start',
            meeting_title: meetingTitle || 'Live Meeting',
          }));
          resolve();
        };
        ws.onerror = reject;
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create audio context for processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Send audio data to WebSocket
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert Float32 to Int16
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          wsRef.current.send(int16Data.buffer);
        }
      };

      // Start duration timer
      setDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      setIsRecording(true);
      toast.info('Recording started - speak now!');

    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error('Failed to start recording. Check microphone permissions.');
      stopRecording();
    }
  };

  const stopRecording = useCallback(() => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Send stop command and close WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }

    setIsRecording(false);
  }, []);

  const copyTranscript = () => {
    navigator.clipboard.writeText(currentTranscript);
    toast.success('Transcript copied to clipboard!');
  };

  const downloadTranscript = () => {
    const blob = new Blob([currentTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded!');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speakerColors = ['text-blue-400', 'text-green-400', 'text-purple-400', 'text-orange-400', 'text-pink-400'];

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-400" />
          Live Meeting Transcription
          <span className="ml-2 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
            Real-time
          </span>
        </h3>

        <p className="text-sm text-white/60 mb-4">
          Transcribe your meeting in real-time as you speak. Words appear instantly on screen.
        </p>

        <div className="space-y-4">
          {/* Meeting Title */}
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="Meeting title (optional)"
            disabled={isRecording}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />

          {/* Record Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-3 transition-all ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white'
            }`}
          >
            {isRecording ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                Stop Recording ({formatDuration(duration)})
              </>
            ) : (
              <>
                <Radio className="w-5 h-5" />
                Start Live Transcription
              </>
            )}
          </button>

          {/* Status Bar */}
          {isRecording && (
            <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-mono">{formatDuration(duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-white/60" />
                  <span className="text-white/60">{wordCount} words</span>
                </div>
                {speakers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-white/60" />
                    <span className="text-white/60">{speakers.length} speakers</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-xs text-green-400">Connected</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Transcript Display */}
      {(currentTranscript || interimText || isRecording) && (
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AudioWaveform className="w-5 h-5 text-indigo-400" />
              Live Transcript
            </h3>
            <div className="flex gap-2">
              <button
                onClick={copyTranscript}
                disabled={!currentTranscript}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-50 transition-all"
                title="Copy transcript"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={downloadTranscript}
                disabled={!currentTranscript}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-50 transition-all"
                title="Download transcript"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={transcriptRef}
            className="p-4 h-64 overflow-y-auto scroll-smooth"
          >
            {currentTranscript ? (
              <div className="space-y-2">
                {segments.map((segment, i) => (
                  <p key={i} className="text-white/90 leading-relaxed">
                    {segment.speaker !== null && (
                      <span className={`font-medium mr-2 ${speakerColors[segment.speaker % speakerColors.length]}`}>
                        Speaker {segment.speaker + 1}:
                      </span>
                    )}
                    {segment.text}
                  </p>
                ))}
                {interimText && (
                  <p className="text-white/50 italic">{interimText}</p>
                )}
              </div>
            ) : isRecording ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
                  <p className="text-white/50">Listening...</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Final Result */}
      {finalResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Transcription Complete
          </h3>

          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-white">{formatDuration(finalResult.durationSeconds)}</p>
              <p className="text-xs text-white/50">Duration</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-white">{finalResult.wordCount}</p>
              <p className="text-xs text-white/50">Words</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-white">{finalResult.speakers}</p>
              <p className="text-xs text-white/50">Speakers</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-green-400">${finalResult.cost.toFixed(4)}</p>
              <p className="text-xs text-white/50">API Cost</p>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={copyTranscript}
              className="flex-1 py-3 rounded-xl font-medium bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 transition-all"
            >
              <Copy className="w-4 h-4" />
              Copy Transcript
            </button>
            <button
              onClick={downloadTranscript}
              className="flex-1 py-3 rounded-xl font-medium bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={() => {
                // Copy transcript to clipboard for use in analyze tab
                if (finalResult?.transcript) {
                  navigator.clipboard.writeText(finalResult.transcript);
                  toast.success('Transcript copied! Paste it in the Analyze Notes tab.');
                }
                onAnalyze();
              }}
              className="flex-1 py-3 rounded-xl font-medium bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center gap-2 transition-all"
            >
              <Brain className="w-4 h-4" />
              Analyze with AI
            </button>
          </div>
        </motion.div>
      )}

      {/* Info */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-sm text-blue-300">
          <strong>How it works:</strong> Audio is streamed in real-time to Deepgram's Nova-2 model for instant transcription.
          Speaker detection identifies different voices automatically. Cost: ~$0.0043/minute.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Transcribe Tab
// ============================================================================

function TranscribeTab() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [result, setResult] = useState<{
    transcript: { text: string; durationSeconds: number };
    analysis: MeetingAnalysis;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const transcribeMutation = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error('No audio file');
      return quickTranscribeAndAnalyze(audioFile, meetingTitle || undefined);
    },
    onSuccess: (data) => {
      setResult({
        transcript: { text: data.transcript.text, durationSeconds: data.transcript.durationSeconds },
        analysis: data.analysis as unknown as MeetingAnalysis,
      });
      toast.success(`Analysis complete! Cost: $${data.totalCost.toFixed(3)}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(file);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Recording started...');
    } catch (err) {
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording saved');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload/Record Section */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Mic className="w-5 h-5 text-indigo-400" />
          Record or Upload Meeting Audio
        </h3>

        <div className="space-y-4">
          {/* Meeting Title */}
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="Meeting title (optional)"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Record/Upload Buttons */}
          <div className="flex gap-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-5 h-5" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Start Recording
                </>
              )}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-4 rounded-xl font-medium bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-5 h-5" />
              Upload Audio
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Selected File */}
          {audioFile && (
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <FileAudio className="w-5 h-5 text-green-400" />
              <span className="text-green-400">
                {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
          )}

          {/* Analyze Button */}
          <button
            onClick={() => transcribeMutation.mutate()}
            disabled={!audioFile || transcribeMutation.isPending}
            className="w-full py-4 rounded-xl font-medium bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {transcribeMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Transcribing & Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Transcribe & Analyze with AI
              </>
            )}
          </button>

          <p className="text-xs text-white/40 text-center">
            Cost: ~$0.006/min (transcription) + ~$0.02 (analysis)
          </p>
        </div>
      </div>

      {/* Results */}
      {result && <AnalysisResults analysis={result.analysis} transcript={result.transcript.text} />}
    </div>
  );
}

// ============================================================================
// Analyze Notes Tab
// ============================================================================

function AnalyzeNotesTab() {
  const [notes, setNotes] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [result, setResult] = useState<MeetingAnalysis | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeText(notes, meetingTitle || undefined),
    onSuccess: (data) => {
      setResult(data);
      toast.success('Analysis complete!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Analyze Meeting Notes
        </h3>

        <div className="space-y-4">
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="Meeting title (optional)"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste your meeting notes or transcript here..."
            rows={8}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />

          <button
            onClick={() => analyzeMutation.mutate()}
            disabled={!notes.trim() || analyzeMutation.isPending}
            className="w-full py-4 rounded-xl font-medium bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze with AI
              </>
            )}
          </button>
        </div>
      </div>

      {result && <AnalysisResults analysis={result} />}
    </div>
  );
}

// ============================================================================
// Cost Calculator Tab
// ============================================================================

function CostCalculatorTab() {
  const [duration, setDuration] = useState(60);
  const [attendees, setAttendees] = useState(5);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [costResult, setCostResult] = useState<MeetingCostResult | null>(null);

  const { data: periodCost } = useQuery({
    queryKey: ['period-meeting-cost'],
    queryFn: () => getPeriodMeetingCost(7),
  });

  const calculateMutation = useMutation({
    mutationFn: () => calculateMeetingCost(duration, attendees, hourlyRate),
    onSuccess: (data) => setCostResult(data),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Period Summary */}
      {periodCost && periodCost.totalMeetings > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Last 7 Days Meeting Cost
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">
                ${periodCost.totalCost.toLocaleString()}
              </p>
              <p className="text-xs text-white/50">Total Cost</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-400">{periodCost.totalMeetings}</p>
              <p className="text-xs text-white/50">Meetings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400">{periodCost.totalHours}h</p>
              <p className="text-xs text-white/50">In Meetings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white/70">
                ${periodCost.avgMeetingCost.toFixed(0)}
              </p>
              <p className="text-xs text-white/50">Avg per Meeting</p>
            </div>
          </div>
        </div>
      )}

      {/* Calculator */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          Meeting Cost Calculator
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm text-white/60 mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Attendees</label>
            <input
              type="number"
              value={attendees}
              onChange={(e) => setAttendees(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Hourly Rate ($)</label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={() => calculateMutation.mutate()}
          disabled={calculateMutation.isPending}
          className="w-full py-3 rounded-xl font-medium bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2 transition-all"
        >
          Calculate Cost
        </button>
      </div>

      {/* Cost Result */}
      {costResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white/5 border border-white/10 p-6"
        >
          <div className="text-center mb-6">
            <p className="text-5xl font-bold text-red-400">${costResult.totalCost}</p>
            <p className="text-white/60 mt-2">Total Meeting Cost</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-white">${costResult.baseCost}</p>
              <p className="text-xs text-white/50">Base Cost</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-white">${costResult.prepCost}</p>
              <p className="text-xs text-white/50">Prep Time</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-white">${costResult.recoveryCost}</p>
              <p className="text-xs text-white/50">Recovery Time</p>
            </div>
          </div>

          {/* Opportunity Cost */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <h4 className="text-sm font-semibold text-yellow-400 mb-2">
              Instead, your team could have:
            </h4>
            <ul className="space-y-1 text-sm text-white/70">
              <li>Written {costResult.opportunityCost.couldHaveWritten}</li>
              <li>Fixed {costResult.opportunityCost.couldHaveFixed}</li>
              <li>Reviewed {costResult.opportunityCost.couldHaveReviewed}</li>
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// Analysis Results Component
// ============================================================================

function AnalysisResults({
  analysis,
  transcript,
}: {
  analysis: MeetingAnalysis | { summary: string; actionItems: any[]; decisions: string[]; meetingScore: number; couldBeEmail: boolean };
  transcript?: string;
}) {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Meeting Score */}
      {'meetingScore' in analysis && analysis.meetingScore !== null && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Meeting Quality Score</h3>
              <p className="text-white/50 text-sm">
                {'couldBeEmail' in analysis && analysis.couldBeEmail && (
                  <span className="text-yellow-400 flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    This meeting could have been an email
                  </span>
                )}
              </p>
            </div>
            <div
              className={`text-5xl font-bold ${
                analysis.meetingScore >= 70
                  ? 'text-green-400'
                  : analysis.meetingScore >= 40
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}
            >
              {analysis.meetingScore}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {'summary' in analysis && analysis.summary && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Summary
          </h3>
          <p className="text-white/80 leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Action Items */}
      {'actionItems' in analysis && analysis.actionItems.length > 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-green-400" />
            Action Items ({analysis.actionItems.length})
          </h3>
          <ul className="space-y-2">
            {analysis.actionItems.map((item: any, i: number) => (
              <li key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white">{item.task}</p>
                  <div className="flex gap-2 mt-1">
                    {item.assignee && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                        {item.assignee}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        item.priority === 'high'
                          ? 'bg-red-500/20 text-red-400'
                          : item.priority === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Decisions */}
      {'decisions' in analysis && analysis.decisions.length > 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Decisions Made ({analysis.decisions.length})
          </h3>
          <ul className="space-y-2">
            {analysis.decisions.map((decision: string, i: number) => (
              <li key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <CheckCircle className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-white">{decision}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transcript Toggle */}
      {transcript && (
        <div className="rounded-2xl bg-white/5 border border-white/10">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full p-4 flex items-center justify-between text-white/60 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileAudio className="w-5 h-5" />
              View Full Transcript
            </span>
            {showTranscript ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {showTranscript && (
            <div className="p-4 pt-0 border-t border-white/10">
              <pre className="text-sm text-white/70 whitespace-pre-wrap font-sans">{transcript}</pre>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
