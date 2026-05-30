'use client';

import { useState } from 'react';
import { mockAudioPlayerRecordings } from '@/data/mockAudioPlayerRecordings';
import CustomAudioPlayer from './CustomAudioPlayer';

export default function CustomAudioPlayerDemo() {
  const [activeRecordingId, setActiveRecordingId] = useState(null);

  return (
    <div className="flex max-w-[680px] flex-col gap-3">
      {mockAudioPlayerRecordings.map((recording) => (
        <CustomAudioPlayer
          key={recording.id}
          src={recording.audio_url}
          title={recording.contributor_title}
          recordingId={recording.id}
          durationSeconds={recording.duration_seconds}
          isActive={activeRecordingId === recording.id}
          onPlay={setActiveRecordingId}
          onPause={() => setActiveRecordingId(null)}
          onEnded={() => setActiveRecordingId(null)}
        />
      ))}
    </div>
  );
}
