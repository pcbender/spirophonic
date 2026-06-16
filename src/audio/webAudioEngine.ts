import type { SpirophonicModel } from '../core/model'
import { pointToFrequency, pointToPan } from '../core/mapping'
import type { SpiroPoint } from '../core/spirograph'

type AudioState = {
  context: AudioContext
  oscillator: OscillatorNode
  gain: GainNode
  pan: StereoPannerNode
}

export class WebAudioEngine {
  private state: AudioState | null = null

  async start(model: SpirophonicModel, point: SpiroPoint, points: Array<SpiroPoint>) {
    if (this.state) {
      this.update(model, point, points)
      return
    }

    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const pan = context.createStereoPanner()
    const now = context.currentTime

    oscillator.type = model.sound.waveform
    oscillator.frequency.setValueAtTime(pointToFrequency(point, model, points), now)
    pan.pan.setValueAtTime(pointToPan(point, points), now)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.035, now + 0.04)

    oscillator.connect(pan)
    pan.connect(gain)
    gain.connect(context.destination)
    oscillator.start()

    this.state = { context, oscillator, gain, pan }
  }

  update(model: SpirophonicModel, point: SpiroPoint, points: Array<SpiroPoint>) {
    if (!this.state) {
      return
    }

    const { context, oscillator, pan } = this.state
    const now = context.currentTime

    oscillator.type = model.sound.waveform
    oscillator.frequency.setTargetAtTime(
      pointToFrequency(point, model, points),
      now,
      0.025,
    )
    pan.pan.setTargetAtTime(pointToPan(point, points), now, 0.025)
  }

  stop() {
    if (!this.state) {
      return
    }

    const { context, oscillator, gain } = this.state
    const now = context.currentTime

    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0, now + 0.04)
    oscillator.stop(now + 0.05)
    oscillator.disconnect()
    gain.disconnect()
    void context.close()
    this.state = null
  }
}

