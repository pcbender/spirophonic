import type { Waveform } from '../core/model'
import type { PreviewPlan } from '../core/preview'
import { playDrum } from './drumSynth'
import { playTone } from './toneSynth'

/** How far ahead notes are queued, and how often the queue is topped up. */
const lookahead = 0.25
const tick = 60

/**
 * Loops one bar of the composition.
 *
 * Notes are queued a little ahead of the clock and given explicit start times,
 * so playback stays sample-accurate rather than depending on when a timer
 * happens to fire. Editing while it runs takes effect at the next bar, which
 * keeps a change from landing halfway through one.
 */
export class VoicePreview {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private plan: PreviewPlan | null = null
  private waveform: Waveform = 'triangle'
  private nextBar = 0

  get playing() {
    return this.timer !== null
  }

  start(plan: PreviewPlan, waveform: Waveform) {
    this.plan = plan
    this.waveform = waveform

    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      // Several voices at once add up, so leave headroom rather than clip.
      this.master.gain.value = 0.5
      this.master.connect(this.context.destination)
    }

    void this.context.resume()

    if (this.timer) {
      return
    }

    this.nextBar = this.context.currentTime + 0.1
    this.schedule()
    this.timer = setInterval(() => this.schedule(), tick)
  }

  /** Swaps what the next bar plays without interrupting the current one. */
  update(plan: PreviewPlan, waveform: Waveform) {
    this.plan = plan
    this.waveform = waveform
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    const { context, master } = this

    if (!context || !master) {
      return
    }

    const now = context.currentTime

    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(0, now + 0.05)

    window.setTimeout(() => {
      void context.close()
      this.context = null
      this.master = null
    }, 120)
  }

  private schedule() {
    const { context, master, plan } = this

    if (!context || !master || !plan || plan.barSeconds <= 0) {
      return
    }

    while (this.nextBar < context.currentTime + lookahead) {
      for (const hit of plan.hits) {
        const at = this.nextBar + hit.offset

        if (at < context.currentTime) {
          continue
        }

        if (hit.kind === 'percussion') {
          playDrum(context, master, hit.note, at, hit.level)
        } else {
          playTone(
            context,
            master,
            hit.note,
            at,
            hit.duration,
            hit.level,
            this.waveform,
          )
        }
      }

      this.nextBar += plan.barSeconds
    }
  }
}
