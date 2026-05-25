import { Audio } from 'expo-av';
import { Platform } from 'react-native';

import { saveAiConversation } from './ai-conversations';
import { chatWithClaude, getUserContext, transcribeAudio } from './ai';
import { getCurrentUser } from './auth';
import { checkConsultationUsage } from './ai-usage';

const MAX_RECORDING_MS = 30_000;
const MIN_RECORDING_MS = 1_000;

let activeRecording: Audio.Recording | null = null;
let recordingStartedAt = 0;
let maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
let onMaxDurationReached: (() => void) | null = null;

function clearMaxDurationTimer() {
  if (maxDurationTimer) {
    clearTimeout(maxDurationTimer);
    maxDurationTimer = null;
  }
}

export async function requestMicrophonePermission() {
  const permission = await Audio.requestPermissionsAsync();
  return permission.granted;
}

export async function startVoiceRecording(onMaxDuration?: () => void) {
  if (Platform.OS === 'web') {
    throw new Error('음성 상담은 iOS·Android 앱에서 이용할 수 있어요');
  }

  const granted = await requestMicrophonePermission();

  if (!granted) {
    throw new Error('마이크 권한이 필요해요');
  }

  if (activeRecording) {
    try {
      await activeRecording.stopAndUnloadAsync();
    } catch {
      // ignore stale recording
    }

    activeRecording = null;
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();

  activeRecording = recording;
  recordingStartedAt = Date.now();
  onMaxDurationReached = onMaxDuration ?? null;

  clearMaxDurationTimer();
  maxDurationTimer = setTimeout(() => {
    onMaxDurationReached?.();
  }, MAX_RECORDING_MS);
}

export async function stopVoiceRecording() {
  clearMaxDurationTimer();

  const recording = activeRecording;

  if (!recording) {
    throw new Error('더 길게 말해주세요');
  }

  activeRecording = null;

  try {
    await recording.stopAndUnloadAsync();
  } catch {
    throw new Error('더 길게 말해주세요');
  }

  const uri = recording.getURI();
  const durationMs = Date.now() - recordingStartedAt;

  if (!uri || durationMs < MIN_RECORDING_MS) {
    throw new Error('더 길게 말해주세요');
  }

  return { uri, durationMs };
}

export async function processVoiceConsultation(audioUri: string) {
  const usage = await checkConsultationUsage();

  if (!usage.allowed) {
    throw new Error(usage.message);
  }

  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const userMessage = await transcribeAudio(audioUri);
  const userContext = await getUserContext(user.id);
  const aiResponse = await chatWithClaude(userMessage, userContext);

  return saveAiConversation({
    userMessage,
    aiResponse,
    audioUrl: audioUri,
    contextUsed: {
      ...userContext,
      source: 'voice',
    },
  });
}

export function isVoiceRecordingActive() {
  return activeRecording !== null;
}
