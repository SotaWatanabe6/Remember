import Image from 'next/image';

export default function ContributionTextField({
  id,
  label,
  recording = false,
  recordingLabel = recording ? 'Stop voice typing' : 'Start voice typing',
  recordingDisabled = false,
  onToggleRecording,
  disabled = false,
  ...textareaProps
}) {
  return (
    <div className="flex min-h-[250px] items-start gap-3 rounded-[13px] border border-r-muted p-5 focus-within:ring-1 focus-within:ring-r-text sm:gap-5">
      <button type="button" onClick={onToggleRecording} disabled={disabled || recordingDisabled}
        aria-pressed={recording} aria-label={recordingLabel}
        className="flex size-10 shrink-0 items-center justify-center rounded-full hover:opacity-70 focus-visible:outline-2 disabled:opacity-50">
        {recording ? <span className="size-5 rounded-sm bg-r-danger" /> : <Image src="/icons/story-record.svg" width={40} height={40} alt="" />}
      </button>
      <label htmlFor={id} className="sr-only">{label}</label>
      <textarea {...textareaProps} id={id} disabled={disabled}
        className="min-h-[208px] min-w-0 flex-1 resize-y bg-transparent text-[20px] leading-[26px] outline-none disabled:opacity-50" />
    </div>
  );
}
