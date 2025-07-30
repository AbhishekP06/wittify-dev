import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { getBackendUrl } from './config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface VoiceProcessingResult {
  transcript: string;
  response: string;
  audio: string;
  timing: {
    total: number;
    stt: number;
    llm: number;
    tts: number;
  };
  error?: string;
}

const VoiceAI: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isConversationActive, setIsConversationActive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [isReplyCompleted, setIsReplyCompleted] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    setupAudio();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = async (): Promise<void> => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (error) {
        console.warn('Error stopping recording during cleanup:', error);
      }
    }
  };

  const setupAudio = async (): Promise<void> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Audio recording permission is required');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Audio setup failed:', error);
      Alert.alert('Error', 'Failed to setup audio permissions');
    }
  };

  const startRecording = async (): Promise<void> => {
    if (!isConversationActive) return;
    if (isPlaying) return;
    if (isRecording) return;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Audio recording permission is required');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      setIsRecording(true);
      setTranscript('');
      setAiResponse('');

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
      }

      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;

      if (!recording) {
        setIsRecording(false);
        Alert.alert('Error', 'Failed to create recording object');
        return;
      }

      const recordingStatus = await recording.getStatusAsync();
      if (!recordingStatus.isRecording) {
        setIsRecording(false);
        Alert.alert('Error', 'Recording failed to start');
        return;
      }

      setCountdown(5);
      const countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const autoStopTimer = setTimeout(async () => {
        if (recordingRef.current && isConversationActive) {
          await stopRecording();
        }
      }, 5000);

      if (recordingRef.current) {
        (recordingRef.current as any).autoStopTimer = autoStopTimer;
        (recordingRef.current as any).countdownTimer = countdownTimer;
      } else {
        clearTimeout(autoStopTimer);
        clearInterval(countdownTimer);
      }

    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', 'Failed to start recording: ' + errorMessage);
    }
  };

  const stopRecording = async (): Promise<void> => {
    try {
      setIsRecording(false);
      setIsProcessing(true);

      if (!recordingRef.current) {
        setIsProcessing(false);
        return;
      }

      if (recordingRef.current && (recordingRef.current as any).autoStopTimer) {
        clearTimeout((recordingRef.current as any).autoStopTimer);
      }

      if (recordingRef.current && (recordingRef.current as any).countdownTimer) {
        clearInterval((recordingRef.current as any).countdownTimer);
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('Recording URI is null');
      }

      await processVoiceInput(uri);

    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to process recording');
    }
  };

  const processVoiceInput = async (audioUri: string): Promise<void> => {
    try {
      setIsProcessing(true);

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/wav',
        name: 'voice.wav',
      } as any);

      formData.append('history', JSON.stringify(conversationHistory.slice(-6)));

      const response = await fetch('https://wittify-dev-777785888075.europe-west1.run.app/voice/process', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: VoiceProcessingResult = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setTranscript(result.transcript);
      setAiResponse(result.response);

      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: result.transcript },
        { role: 'assistant', content: result.response }
      ]);

      await playAudioFromBase64(result.audio);

      setIsReplyCompleted(true);

    } catch (error) {
      console.error('Voice processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Processing failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioFromBase64 = async (base64Audio: string): Promise<void> => {
    try {
      setIsPlaying(true);

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const audioUri = `${FileSystem.documentDirectory}temp_audio_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(audioUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });

      if (Platform.OS === 'ios') {
        await new Promise(res => setTimeout(res, 200));
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        {
          shouldPlay: true,
          isLooping: false,
          volume: 1.0,
        },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            setIsReplyCompleted(false);
            FileSystem.deleteAsync(audioUri, { idempotent: true }).catch(console.warn);

            if (isConversationActive && !isRecording && !isProcessing && !isPlaying) {
              startRecording();
            }
          }
        }
      );

      soundRef.current = sound;

    } catch (error) {
      console.error('Audio playback failed:', error);
      setIsPlaying(false);
      Alert.alert('Error', 'Failed to play audio response');
    }
  };

  const playAudioResponse = async (base64Audio: string): Promise<void> => {
    await playAudioFromBase64(base64Audio);
  };

  const getStatusText = (): string => {
    if (!isConversationActive) return 'Conversation stopped';
    if (isRecording) return 'Listening... (5s)';
    if (isProcessing) return 'Processing...';
    if (isPlaying) return 'Speaking...';
    return 'Conversation active - waiting...';
  };

  const getStatusColor = (): string => {
    if (!isConversationActive) return '#999999';
    if (isRecording) return '#ff4444';
    if (isProcessing) return '#ffaa00';
    if (isPlaying) return '#44ff44';
    return '#4444ff';
  };

  const isButtonDisabled = (): boolean => {
    return isProcessing || isPlaying;
  };

  const clearConversation = (): void => {
    setConversationHistory([]);
    setTranscript('');
    setAiResponse('');
  };

  const startConversation = (): void => {
    setIsConversationActive(true);
    setTranscript('');
    setAiResponse('');
    setIsReplyCompleted(false);
    setTimeout(() => {
      startRecording();
    }, 100);
  };

  const stopConversation = (): void => {
    setIsConversationActive(false);
    setIsRecording(false);
    setIsProcessing(false);
    setIsPlaying(false);
    setIsReplyCompleted(false);
    setCountdown(0);

    if (recordingRef.current) {
      if ((recordingRef.current as any).autoStopTimer) {
        clearTimeout((recordingRef.current as any).autoStopTimer);
      }
      if ((recordingRef.current as any).countdownTimer) {
        clearInterval((recordingRef.current as any).countdownTimer);
      }
      recordingRef.current.stopAndUnloadAsync().catch(console.warn);
      recordingRef.current = null;
    }

    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(console.warn);
      soundRef.current = null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice AI Assistant</Text>
        <Text style={styles.status}>{getStatusText()}</Text>

        <View style={styles.buttonContainer}>
          {!isConversationActive ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startConversation}
            >
              <Text style={styles.startButtonText}>Start Conversation</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopConversation}
            >
              <Text style={styles.stopButtonText}>Stop Conversation</Text>
            </TouchableOpacity>
          )}

          {conversationHistory.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearConversation}
            >
              <Text style={styles.clearButtonText}>Clear Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.conversationArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {conversationHistory.length > 0 ? (
          <View style={styles.conversationContainer}>
            {conversationHistory.map((message, index) => (
              <View
                key={index}
                style={[
                  styles.messageContainer,
                  message.role === 'user' ? styles.userMessage : styles.aiMessage
                ]}
              >
                <Text style={styles.label}>
                  {message.role === 'user' ? 'You said:' : 'AI replied:'}
                </Text>
                <Text style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userText : styles.aiText
                ]}>
                  {message.content}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Hold the button below and start talking to your AI assistant
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.controlsArea}>
        {isConversationActive && (
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              { backgroundColor: getStatusColor() }
            ]} />
            <Text style={styles.statusIndicatorText}>
              {isRecording ? `Recording... (${countdown}s)` : isProcessing ? 'Processing...' : isPlaying ? 'Speaking...' : isReplyCompleted ? 'Reply ready' : 'Waiting...'}
            </Text>
          </View>
        )}

        {isConversationActive && !isRecording && !isProcessing && !isPlaying && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => {
              startRecording();
            }}
          >
            <Text style={styles.debugButtonText}>Test Recording</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.instruction}>
          {!isConversationActive
            ? 'Tap "Start Conversation" to begin automatic conversation'
            : isRecording
              ? 'Recording for 5 seconds automatically...'
              : isProcessing
                ? 'Processing your voice...'
                : isPlaying
                  ? 'AI is speaking...'
                  : 'Waiting for next turn...'
          }
        </Text>

        {conversationHistory.length > 0 && (
          <Text style={styles.conversationCount}>
            Messages: {conversationHistory.length}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  conversationArea: {
    flex: 1,
    marginBottom: 30,
  },
  scrollContent: {
    flexGrow: 1,
  },
  conversationContainer: {
    flex: 1,
  },
  messageContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userMessage: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  aiMessage: {
    backgroundColor: '#f8fff0',
    borderLeftWidth: 4,
    borderLeftColor: '#44aa44',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  transcript: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  aiResponse: {
    fontSize: 16,
    color: '#0066cc',
    lineHeight: 22,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#333',
  },
  aiText: {
    color: '#0066cc',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  controlsArea: {
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusIndicatorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  debugButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  instruction: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  conversationCount: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
export default VoiceAI;
