const correctSound = new Audio('/assets/audio/correct.wav')
const wrongSound = new Audio('/assets/audio/wrong.wav')
correctSound.preload = 'auto'
wrongSound.preload = 'auto'

function playClip(clip: HTMLAudioElement) {
  clip.pause()
  clip.currentTime = 0
  void clip.play().catch(() => {})
}

export function speakAnswerFeedback(correct: boolean) {
  playClip(correct ? correctSound : wrongSound)
}
