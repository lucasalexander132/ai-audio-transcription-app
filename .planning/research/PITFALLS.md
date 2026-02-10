# Domain Pitfalls: Real-Time Audio Transcription Web App

**Domain:** Real-time audio transcription PWA (Next.js + Convex + Deepgram + Claude API)
**Researched:** 2026-02-09
**Confidence:** MEDIUM (WebSearch verified with multiple sources; some platform-specific details require testing)

## Critical Pitfalls

Mistakes that cause rewrites, major architectural changes, or complete feature failures.

---

### Pitfall 1: iOS Safari Audio Format Incompatibility

**What goes wrong:**
MediaRecorder API on iOS Safari outputs `audio/webm;codecs=opus` by default, but if your backend expects WAV files, transcription services like Google Speech-to-Text will reject the audio with encoding errors. This creates a broken experience for 25-40% of your mobile users.

**Why it happens:**
Developers assume MediaRecorder produces the same format across browsers, but iOS Safari has limited codec support and defaults to WebM/Opus even when other formats are requested. The format must be transcoded client-side or server-side before sending to transcription services.

**Consequences:**
- Transcription fails silently or with cryptic errors for iOS users
- User reports "it works on my Android but not iPhone"
- Requires backend rewrite to handle format conversion
- May need to implement client-side format conversion (CPU intensive on mobile)

**Prevention:**
```javascript
// Test formats in order of preference
const formats = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/wav'
];

let selectedFormat = formats.find(format =>
  MediaRecorder.isTypeSupported(format)
);

// Deepgram accepts WebM/Opus, but verify your entire pipeline
const recorder = new MediaRecorder(stream, {
  mimeType: selectedFormat
});
```

**Detection:**
- User-agent based browser testing shows format mismatches
- Transcription error rates spike for iOS Safari users
- Server logs show "unsupported encoding" errors

**Phase mapping:**
- **Phase 0 (Foundation):** Must verify format compatibility during initial MediaRecorder setup
- **Phase 1 (Recording):** Test on actual iOS devices, not just simulators

**Sources:**
- [How to Implement MediaRecorder API Audio Recording with iPhone Safari Support](https://www.buildwithmatija.com/blog/iphone-safari-mediarecorder-audio-recording-transcription)
- [MediaRecorder API Codec Support in Safari](https://webkit.org/blog/11353/mediarecorder-api/)

---

### Pitfall 2: Deepgram WebSocket Timeout (NET-0001 Error)

**What goes wrong:**
Deepgram closes WebSocket connections after 10 seconds of silence, triggering a NET-0001 error. During natural conversation pauses (speaker thinking, interruptions), the connection dies and transcription stops permanently until manually reconnected.

**Why it happens:**
Developers don't implement keep-alive messages. Deepgram requires a KeepAlive message every 3-5 seconds to prevent the 10-second timeout, but this isn't obvious in quickstart documentation.

**Consequences:**
- Connection drops during natural conversation pauses
- Lost audio chunks between disconnect and reconnect
- User must manually restart recording
- Degraded user experience during actual use (vs. continuous test recordings)

**Prevention:**
```javascript
// Send KeepAlive every 5 seconds as text WebSocket frame
const keepAliveInterval = setInterval(() => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'KeepAlive' }));
  }
}, 5000);

// CRITICAL: Send as TEXT frame, not binary
// Binary KeepAlive may be misinterpreted
```

**Detection:**
- NET-0001 errors in logs after ~10 seconds of silence
- Connection state changes from OPEN to CLOSED unexpectedly
- Users report "recording stopped working mid-conversation"

**Phase mapping:**
- **Phase 1 (Recording):** Implement during initial WebSocket setup
- **Phase 2 (Streaming):** Add monitoring/alerts for NET-0001 errors

**Sources:**
- [Audio Keep Alive | Deepgram Docs](https://developers.deepgram.com/docs/audio-keep-alive)
- [Holding Streams Open with Stream KeepAlive](https://deepgram.com/learn/holding-streams-open-with-stream-keepalive)

---

### Pitfall 3: iOS PWA Audio Recording 44-Byte Empty WAV Bug

**What goes wrong:**
In PWA standalone mode on iOS, audio recording appears to work (permission granted, file uploaded), but only a 44-byte empty WAV header is saved instead of actual audio data. This is a critical iOS WebKit bug that makes PWA audio recording completely non-functional.

**Why it happens:**
iOS Safari has incomplete PWA MediaRecorder implementation. In standalone mode (home screen installed), the MediaRecorder API appears to function but fails to capture actual audio data, only writing the WAV file header.

**Consequences:**
- PWA appears to work but silently fails
- Users think they're recording but get no transcription
- Discovered only after users report "no results"
- May require fallback to browser mode or native app wrapper

**Prevention:**
1. Test audio recording extensively in PWA standalone mode on physical iOS devices
2. Implement validation: check recorded blob size is > 1KB before uploading
3. Consider hybrid approach: prompt iOS users to use Safari browser mode instead of installed PWA
4. Provide clear UX indicator when recording may not work

```javascript
// Validate recording before upload
recorder.onstop = (e) => {
  const blob = new Blob(chunks, { type: 'audio/webm' });

  if (blob.size < 1024) {
    // Likely the 44-byte bug
    showError('Recording failed. Please use Safari browser instead of installed app.');
    return;
  }

  uploadRecording(blob);
};
```

**Detection:**
- Blob size consistently 44 bytes on iOS PWA
- Transcription returns empty/error for all iOS PWA uploads
- User reports "it worked in Safari but not after installing"

**Phase mapping:**
- **Phase 0 (Foundation):** Critical platform compatibility research
- **Phase 1 (Recording):** Must detect and handle before launch
- Consider browser-only mode for iOS if unfixable

**Sources:**
- [Audio Recorder in iOS in PWA standalone mode](https://forum.zeroqode.com/t/audio-recorder-in-ios-in-pwa-standalone-mode/4029)
- [PWA iOS Limitations and Safari Support: Complete Guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)

---

### Pitfall 4: WebSocket Reconnection Audio Loss

**What goes wrong:**
When WebSocket connection drops (common on mobile networks), the app reconnects but loses 2-5 seconds of audio that was sent during disconnect/reconnect window. Users get incomplete transcriptions with missing words/sentences.

**Why it happens:**
Developers implement reconnection but don't buffer unacknowledged audio. Mobile networks frequently switch towers, drop connections, or experience packet loss, causing WebSocket disconnects.

**Consequences:**
- Silent data loss - users don't know transcription is incomplete
- Critical words/phrases missing from transcription
- Unusable for meeting notes, medical dictation, legal recording
- Quality issues only discovered in production with real mobile usage

**Prevention:**
Implement reconnection with exponential backoff AND audio replay buffer:

```javascript
// Maintain rolling buffer of last 5 seconds (~160KB for 16kHz mono)
const audioBuffer = new CircularBuffer(160 * 1024);

// On send
function sendAudio(chunk) {
  audioBuffer.push(chunk);
  socket.send(chunk);
}

// On reconnect
function reconnect() {
  const backoff = Math.min(1000 * Math.pow(2, attempts), 20000);
  setTimeout(() => {
    socket = new WebSocket(url);

    socket.onopen = () => {
      // Replay last 5 seconds to maintain continuity
      audioBuffer.getAll().forEach(chunk => socket.send(chunk));
      attempts = 0;
    };
  }, backoff);
}
```

**Detection:**
- Transcription word count significantly lower than expected
- Missing sections correlate with WebSocket state changes
- Mobile users report worse quality than desktop users

**Phase mapping:**
- **Phase 2 (Streaming):** Implement during real-time streaming feature
- **Phase 3 (Reliability):** Add monitoring for dropped chunks

**Sources:**
- [How to Handle WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view)
- [Streaming Speech Recognition API for Real-Time Transcription](https://deepgram.com/learn/streaming-speech-recognition-api)

---

### Pitfall 5: iOS Safari IndexedDB Data Eviction

**What goes wrong:**
Stored transcriptions in IndexedDB are silently deleted by iOS Safari after 7 days if the PWA isn't used. Users return after a week to find their transcript library completely empty, with no warning or recovery option.

**Consequences:**
- Data loss destroys user trust
- No way to recover deleted transcriptions
- Users complain "app deleted my recordings"
- May violate expectations for "local-first" app

**Why it happens:**
iOS Safari aggressively evicts cached data and IndexedDB storage to manage storage pressure. The 50MB storage limit is strictly enforced, and unused PWAs are targeted first. Additionally, IndexedDB on iOS has a history of data corruption and transaction failures.

**Prevention:**
1. Use Convex as source of truth, not IndexedDB
2. Implement explicit sync status UI: "Synced to cloud" vs "Local only"
3. Warn users that local-only data may be lost on iOS
4. Request persistent storage (may not be granted on iOS):

```javascript
if (navigator.storage && navigator.storage.persist) {
  const isPersisted = await navigator.storage.persist();
  if (!isPersisted) {
    showWarning('iOS may delete local data. Keep app open to sync to cloud.');
  }
}

// Monitor quota
const estimate = await navigator.storage.estimate();
if (estimate.usage / estimate.quota > 0.8) {
  showWarning('Running low on storage. Older transcripts may be deleted.');
}
```

**Detection:**
- Users report missing transcriptions after app was inactive
- Storage quota shows 0 bytes despite previous data
- Error logs show IndexedDB transaction failures

**Phase mapping:**
- **Phase 0 (Foundation):** Choose Convex-first architecture, not IndexedDB-first
- **Phase 3 (Offline):** If implementing offline mode, test data persistence across 7+ day gaps

**Sources:**
- [PWA offline audio recording storage IndexedDB limitations](https://web.dev/learn/pwa/offline-data)
- [Navigating Safari/iOS PWA Limitations](https://vinova.sg/navigating-safari-ios-pwa-limitations/)
- [Store data on the device - Microsoft Edge](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/offline)

---

## Moderate Pitfalls

Mistakes that cause delays, degraded UX, or significant technical debt.

---

### Pitfall 6: Real-Time Transcript DOM Thrashing

**What goes wrong:**
Rendering each transcription word/token as it arrives causes 10-50 DOM updates per second, freezing the UI and making the app unusable during active transcription.

**Why it happens:**
Naive implementation appends each word to the DOM immediately. React re-renders the entire transcript component on every state update, even with thousands of words already displayed.

**Prevention:**
1. Batch updates: buffer 100-250ms of tokens before updating DOM
2. Use virtual scrolling for long transcripts (react-window, TanStack Virtual)
3. Memoize transcript lines with React.memo()
4. Use useTransition for non-urgent updates (React 18+)

```javascript
// Bad: Update on every token
socket.onmessage = (msg) => {
  setTranscript(prev => prev + msg.data.token);
};

// Good: Batch updates
const tokenBuffer = [];
const flushInterval = setInterval(() => {
  if (tokenBuffer.length > 0) {
    setTranscript(prev => prev + tokenBuffer.join(''));
    tokenBuffer.length = 0;
  }
}, 100);

socket.onmessage = (msg) => {
  tokenBuffer.push(msg.data.token);
};
```

**Detection:**
- Frame rate drops below 30fps during transcription
- Browser DevTools show excessive layout recalculations
- UI becomes unresponsive when transcript exceeds 1000 words

**Phase mapping:**
- **Phase 2 (Streaming):** Implement batching from the start
- **Phase 4 (Performance):** Add virtual scrolling for long transcripts

**Sources:**
- [Virtual Scrolling in React](https://blog.logrocket.com/virtual-scrolling-core-principles-and-basic-implementation-in-react/)
- [Real-time Transcription Guide 2026](https://picovoice.ai/blog/complete-guide-to-streaming-speech-to-text/)

---

### Pitfall 7: Speaker Diarization Accuracy Collapse with 3+ Speakers

**What goes wrong:**
Speaker diarization works great with 2 speakers (96-98% accuracy) but degrades rapidly with 3+ speakers or moderate background noise, dropping to 85-90% accuracy. Speakers get mislabeled frequently, confusing transcript readers.

**Why it happens:**
Real-time diarization has limited context compared to post-processing. The model can't process the entire stream at once, leading to misallocation of speech segments during clustering. This gets exponentially worse with more voices.

**Prevention:**
1. Set user expectations: "Speaker labels work best with 2-3 clear speakers"
2. Provide manual speaker label editing in UI
3. Use Deepgram's diarization feature (if available) or Pyannote 3.1 for post-processing
4. Consider color-coding speakers instead of "Speaker 1, Speaker 2" labels

```javascript
// Display confidence with speaker labels
{transcript.words.map(word => (
  <span className={word.speaker_confidence < 0.7 ? 'uncertain' : ''}>
    {word.speaker}: {word.text}
  </span>
))}

// Allow manual correction
<button onClick={() => reassignSpeaker(word.id, 'Speaker 2')}>
  Wrong speaker? Click to fix
</button>
```

**Detection:**
- User reports "speaker labels are mixed up"
- Diarization confidence scores below 0.7
- Accuracy degrades with >2 speakers in test recordings

**Phase mapping:**
- **Phase 2 (Streaming):** Test diarization accuracy limits early
- **Phase 5 (Polish):** Add manual editing UI if needed

**Sources:**
- [Best Speaker Diarization Models Compared 2026](https://brasstranscripts.com/blog/speaker-diarization-models-comparison)
- [What is speaker diarization and how does it work?](https://www.assemblyai.com/blog/what-is-speaker-diarization-and-how-does-it-work)

---

### Pitfall 8: Mobile Browser Background Tab Recording Suspension

**What goes wrong:**
User switches to another tab or locks their phone while recording, and audio capture stops. They return to find a partial/incomplete transcription with no indication it stopped.

**Why it happens:**
Mobile browsers suspend background tabs to save battery. getUserMedia streams may continue in some browsers but are unpredictable. iOS Safari is particularly aggressive. YouTube recently blocked background playback for non-Premium users, showing this is platform-controlled behavior.

**Prevention:**
1. Detect visibility change and warn user
2. Use Wake Lock API to keep screen active (may not work on all browsers)
3. Provide clear UI indicator: "Recording stops if you leave this tab"

```javascript
// Warn on visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isRecording) {
    showWarning('Recording may stop when app is in background. Keep app open.');

    // Optionally pause recording
    pauseRecording();
  }
});

// Request wake lock (limited browser support)
let wakeLock = null;
if ('wakeLock' in navigator) {
  wakeLock = await navigator.wakeLock.request('screen');
}
```

**Detection:**
- Recording duration << expected duration
- Users report "recording stopped when I switched apps"
- Timestamps show gaps in continuous recordings

**Phase mapping:**
- **Phase 1 (Recording):** Implement visibility detection
- **Phase 2 (Streaming):** Test background behavior on target devices

**Sources:**
- [YouTube Blocks Background Playback on Mobile Web Browsers](https://www.androidauthority.com/youtube-background-play-broken-3636179/)
- [Mobile browser background tab audio suspended](https://community.e.foundation/t/tab-playing-audio-gets-wrongly-suspended/64105)

---

### Pitfall 9: getUserMedia Permission Prompt Inconsistency

**What goes wrong:**
Calling getUserMedia() immediately on page load triggers permission prompt before user understands why, leading to 40-60% rejection rate. Once blocked, difficult to get users to re-enable in browser settings.

**Why it happens:**
Developers don't follow contextual permission request best practices. Each browser has different permission dialogs that behave differently: Chrome/Firefox are persistent at session level, Safari permissions reset frequently, and macOS requires OS-level permissions for non-Safari browsers.

**Prevention:**
1. Never call getUserMedia() on page load
2. Show explanatory UI first: "We need microphone access to transcribe your voice"
3. Trigger permission request from user action (button click)
4. Handle errors gracefully with actionable guidance

```javascript
// Bad: immediate permission request
useEffect(() => {
  navigator.mediaDevices.getUserMedia({ audio: true });
}, []);

// Good: user-initiated with explanation
function handleStartRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    startRecording(stream);
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      showHelp('Microphone blocked. Click the camera icon in address bar to allow.');
    } else if (err.name === 'NotFoundError') {
      showHelp('No microphone detected. Please connect a microphone.');
    }
  }
}
```

**Detection:**
- High permission rejection rate (>30%)
- NotAllowedError spikes in logs
- Users report "can't get it to work"

**Phase mapping:**
- **Phase 1 (Recording):** Design permission request UX flow
- **Phase 2 (Streaming):** Test across browsers and platforms

**Sources:**
- [Getting browser microphone permission - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Build_a_phone_with_peerjs/Connect_peers/Get_microphone_permission)
- [Mobile audio permissions UX best practices](https://www.mikesmales.com/blog/always-on-best-practices-for-audio-ux-on-microphone-enabled-devices)

---

### Pitfall 10: Noisy Environment Accuracy Collapse

**What goes wrong:**
Transcription works perfectly in quiet office but has 65-80% accuracy on mobile calls with background noise (cafes, streets, cars). Users complain "it doesn't work in real life."

**Why it happens:**
Demos and testing happen in ideal conditions. Real-world audio has compression (mobile calls), background noise, multiple speakers, accents, and poor microphone quality. Contact-center analysis shows same API: 92% accuracy on clean headsets, 78% in conference rooms, 65% on mobile calls.

**Prevention:**
1. Set realistic expectations in UI: "Works best in quiet environments"
2. Test with real-world audio samples (mobile calls, outdoor recordings)
3. Consider noise suppression pre-processing
4. Provide audio quality indicator in real-time

```javascript
// Monitor audio levels to detect noisy environment
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;

function checkNoiseLevel() {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

  if (average > NOISE_THRESHOLD) {
    showWarning('High background noise detected. Transcription quality may be reduced.');
  }
}
```

**Detection:**
- Word Error Rate (WER) spikes in production vs. testing
- User complaints about accuracy correlate with environment
- Confidence scores consistently low (<0.7)

**Phase mapping:**
- **Phase 2 (Streaming):** Test with noisy audio samples
- **Phase 5 (Quality):** Consider noise suppression if budget allows

**Sources:**
- [How Accurate Is AI Transcription in 2026?](https://gotranscript.com/en/blog/ai-transcription-accuracy-benchmarks-2026)
- [Real-time Transcription Guide 2026: Complete Technical Overview](https://picovoice.ai/blog/complete-guide-to-streaming-speech-to-text/)

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

---

### Pitfall 11: Audio File Upload Size Limits

**What goes wrong:**
Users try to upload 1-hour recording (50-100MB) but upload fails silently or with generic error because browser/server has 4GB theoretical limit but app implements 40MB practical limit.

**Why it happens:**
Different limits at different layers: browser (4GB), server framework (varies), API endpoint (Deepgram/Claude), and network timeout (long uploads on mobile).

**Prevention:**
1. Display file size limit clearly in UI: "Max 50MB"
2. Show upload progress with estimated time
3. For large files, consider chunked upload
4. Fail fast with clear error message

```javascript
// Validate before upload
function handleFileUpload(file) {
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB

  if (file.size > MAX_SIZE) {
    showError(`File too large (${formatBytes(file.size)}). Maximum: 50MB`);
    return;
  }

  uploadWithProgress(file);
}
```

**Detection:**
- Upload failures for files >50MB
- Network timeout errors for large files
- User reports "upload just spins forever"

**Phase mapping:**
- **Phase 1 (Recording):** Set and communicate size limits
- **Phase 3 (Upload):** Test with realistic file sizes

**Sources:**
- [Browser audio file upload size limits](https://support.sharetru.com/knowledge-base/webapp-file-upload-limits)

---

### Pitfall 12: Convex Mutation Transaction Conflicts During Streaming

**What goes wrong:**
High-frequency mutations during real-time transcription (appending words every 100ms) cause transaction conflicts and retries, degrading performance or causing duplicate/missing words.

**Why it happens:**
Naive implementation queries entire transcript document, modifies it, and writes back. Convex detects conflicts when multiple mutations target same document and retries, but high-frequency updates can cause retry storms.

**Prevention:**
1. Use precise queries: only read fields you modify
2. Consider separate documents for hot/cold data
3. Append-only pattern: create new word documents instead of updating transcript document
4. Batch updates on client before sending to Convex

```javascript
// Bad: read entire transcript, append word, write back
export const appendWord = mutation(async ({ db }, { transcriptId, word }) => {
  const transcript = await db.get(transcriptId);
  transcript.words.push(word); // conflict risk
  await db.patch(transcriptId, { words: transcript.words });
});

// Good: append-only pattern
export const appendWord = mutation(async ({ db }, { transcriptId, word }) => {
  await db.insert('words', {
    transcriptId,
    text: word.text,
    timestamp: word.timestamp,
    speaker: word.speaker,
  });
});
```

**Detection:**
- Convex dashboard shows high retry rates
- Words appearing out of order or duplicated
- Performance degradation during active transcription

**Phase mapping:**
- **Phase 2 (Streaming):** Design data model to minimize conflicts
- **Phase 4 (Performance):** Optimize if conflicts occur

**Sources:**
- [Optimize Transaction Throughput: 3 Patterns for Scaling with Convex](https://stack.convex.dev/high-throughput-mutations-via-precise-queries)
- [OCC and Atomicity | Convex Developer Hub](https://docs.convex.dev/database/advanced/occ)

---

### Pitfall 13: Mobile Browser Memory Exhaustion

**What goes wrong:**
Recording for 30+ minutes causes browser to crash or freeze on mobile devices as audio blob grows to 50-100MB in memory.

**Why it happens:**
MediaRecorder stores entire recording in memory as blob. Mobile devices have 645MB-2GB memory limits per browser tab (iPhone 6: 645MB, iPhone 7: 2GB). Long recordings exhaust memory.

**Prevention:**
1. Stream to server in chunks instead of storing entire recording
2. Implement maximum recording duration (e.g., 30 minutes)
3. Use MediaRecorder `timeslice` to get data in chunks

```javascript
// Stream chunks instead of buffering
const recorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
});

recorder.ondataavailable = (e) => {
  if (e.data.size > 0) {
    // Send immediately, don't buffer
    sendChunkToServer(e.data);
  }
};

// Request chunks every 10 seconds
recorder.start(10000);
```

**Detection:**
- Browser crashes during long recordings
- Memory usage climbs steadily in DevTools
- User reports "app froze during 1-hour meeting"

**Phase mapping:**
- **Phase 1 (Recording):** Implement chunked recording
- **Phase 2 (Streaming):** Stream instead of buffer

**Sources:**
- [Mobile browser memory limits](https://textslashplain.com/2020/09/15/browser-memory-limits/)
- [Chrome's Blob Storage System Design](https://chromium.googlesource.com/chromium/src/+/224e43ce1ca4f6ca6f2cd8d677b8684f4b7c2351/storage/browser/blob/README.md)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Foundation (Phase 0) | iOS Safari format incompatibility | Test MediaRecorder.isTypeSupported() on iOS devices |
| Recording (Phase 1) | getUserMedia permission UX | Never call on load; provide contextual explanation |
| Streaming (Phase 2) | Deepgram WebSocket timeout | Implement KeepAlive every 5 seconds |
| Streaming (Phase 2) | DOM thrashing from real-time updates | Batch updates (100-250ms), use virtual scrolling |
| Streaming (Phase 2) | WebSocket reconnection audio loss | Buffer last 5 seconds, replay on reconnect |
| Offline (Phase 3) | iOS IndexedDB eviction | Use Convex as source of truth, warn about iOS limitations |
| Upload (Phase 3) | File size limits | Validate early, show clear limits |
| Performance (Phase 4) | Memory exhaustion on long recordings | Stream chunks, set max duration |
| Performance (Phase 4) | Convex transaction conflicts | Append-only pattern, precise queries |
| Quality (Phase 5) | Speaker diarization accuracy | Set expectations, allow manual editing |
| Quality (Phase 5) | Noisy environment accuracy | Test with real-world audio, show quality indicator |

---

## Testing Checklist

Before launch, verify these scenarios:

**iOS Safari (Physical Device Required)**
- [ ] MediaRecorder format detected correctly
- [ ] Audio blob size > 1KB (not 44-byte bug)
- [ ] PWA standalone mode recording works
- [ ] IndexedDB data persists across 7+ day gap
- [ ] Permission prompt flow is clear
- [ ] Background tab behavior is acceptable

**Real-Time Streaming**
- [ ] KeepAlive prevents NET-0001 errors during pauses
- [ ] Reconnection replays buffered audio
- [ ] DOM performance with 5000+ word transcript
- [ ] Speaker diarization with 3+ speakers
- [ ] Noisy environment accuracy acceptable

**Mobile Performance**
- [ ] 30-minute recording doesn't crash
- [ ] Memory usage stays under 500MB
- [ ] Upload progress shows for large files
- [ ] File size validation is clear

**Convex Integration**
- [ ] High-frequency mutations don't cause retry storms
- [ ] Real-time updates don't conflict
- [ ] Transaction conflicts monitored in dashboard

---

## Recovery Strategies

When pitfalls occur in production:

**Audio Format Issues**
- Implement server-side transcoding (FFmpeg)
- Provide format conversion library client-side (heavy)
- Redirect iOS users to format-compatible service

**WebSocket Disconnections**
- Exponential backoff: 1s, 2s, 4s, 8s, 20s max
- Display reconnection status to user
- Replay buffered audio on reconnect

**Permission Blocked**
- Detect NotAllowedError
- Show browser-specific instructions to unblock
- Provide screenshots of settings pages

**Data Loss (iOS)**
- Sync to Convex immediately, not "eventually"
- Show sync status badge: "Synced to cloud ✓"
- Warn users before relying on local storage

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| iOS Safari Issues | HIGH | Multiple verified sources, consistent reports across years |
| Deepgram WebSocket | MEDIUM | Official docs (URLs returned 404 but search results detailed) |
| Mobile Performance | MEDIUM | Browser specs verified, real-world limits from multiple sources |
| Convex Patterns | MEDIUM | Official docs and blog posts, but app-specific testing needed |
| Speaker Diarization | MEDIUM | 2026 benchmarks available, but accuracy varies by implementation |
| Real-World Accuracy | MEDIUM | Industry reports consistent, but specific to audio conditions |

**Overall Confidence: MEDIUM**

Most pitfalls verified with multiple sources from 2026 or official documentation. iOS-specific issues require physical device testing. Real-world accuracy depends on specific use cases and audio conditions.

---

## Sources

### Critical Sources
- [How to Implement MediaRecorder API with iPhone Safari Support](https://www.buildwithmatija.com/blog/iphone-safari-mediarecorder-audio-recording-transcription)
- [Audio Keep Alive | Deepgram Docs](https://developers.deepgram.com/docs/audio-keep-alive)
- [PWA iOS Limitations and Safari Support Guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [How to Handle WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view)
- [Offline data - PWA](https://web.dev/learn/pwa/offline-data)

### Best Practices
- [Mobile audio permissions UX best practices](https://www.mikesmales.com/blog/always-on-best-practices-for-audio-ux-on-microphone-enabled-devices)
- [Getting browser microphone permission - MDN](https://developer.mozilla.org/en-us/docs/Web/API/WebRTC_API/Build_a_phone_with_peerjs/Connect_peers/Get_microphone_permission)
- [Virtual Scrolling in React](https://blog.logrocket.com/virtual-scrolling-core-principles-and-basic-implementation-in-react/)

### Technical References
- [Optimize Transaction Throughput with Convex](https://stack.convex.dev/high-throughput-mutations-via-precise-queries)
- [Browser Memory Limits](https://textslashplain.com/2020/09/15/browser-memory-limits/)
- [Best Speaker Diarization Models Compared 2026](https://brasstranscripts.com/blog/speaker-diarization-models-comparison)

### Accuracy Research
- [How Accurate Is AI Transcription in 2026?](https://gotranscript.com/en/blog/ai-transcription-accuracy-benchmarks-2026)
- [Real-time Transcription Guide 2026](https://picovoice.ai/blog/complete-guide-to-streaming-speech-to-text/)
