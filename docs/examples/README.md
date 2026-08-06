# Reference works

The Compositions MG-21 validates against. They are built in code rather than
stored as JSON, in `src/test/fixtures/compositions.ts`, so a change to the
Composition schema breaks them at compile time instead of leaving a stale file
that silently stops parsing.

Each returns a fresh deep clone, so a test may edit one without leaking into the
next. `allReferenceCompositions()` returns the whole set with labels.

| Fixture | What it demonstrates |
| --- | --- |
| `ringAndSpokeComposition` | The MG-09 first playable slice: one Wheel, one Head, rings and spokes. |
| `multiHeadWheelComposition` | Three Heads sharing one Wheel's clock. |
| `concurrentWheelsComposition` | The MG-12 concurrency reference: four Wheels, three Heads each. |
| `relationHarmonyComposition` | Head-to-Head conjunction and opposition driving a just-tuned Part, plus a continuous control lane. |
| `traceObservationComposition` | Heads observing their own retained Traces, producing Trace Encounters to index. |
| `seededVariationComposition` | All three variation layers on, with a trace explaining every difference. |
| `reinterpretationComposition` | A Composition worth recording, replaying exactly, and reinterpreting. |
| `showcaseComposition` | The release showcase — see below. |

## The showcase

`showcaseComposition()` is the MG-21 acceptance work: **four Wheels of three
Heads each, two Fields, four Parts, and four simultaneous Instruments, one of
which is a SoundFont.**

It can play, seek, be edited at a safe boundary, loop, record, replay,
reinterpret, export MIDI, Strudel, and WAV, save JSON, and round-trip a bundle.
The full workflow runs in Chromium and Firefox in `e2e/app.spec.ts`.

### The SoundFont Instrument names a bank rather than carrying one

No SF2 or SF3 bank ships with this repository. That is a decision, not an
omission: architectural invariant 11 keeps bank bytes out of Composition JSON,
and MG-10 settled that redistributing a bank needs a licence this project does
not hold.

So the showcase's SoundFont Instrument references a digest and waits for you to
supply a matching bank. Import any SF2/SF3 through the Instruments panel and
relink it to hear all four Instruments together.

Without a bank the showcase still works: MG-11's missing-bank isolation reports
the unresolved reference, the three native Instruments play normally, and the
Composition keeps every Part, event, and export. That path is covered in
`src/audio/audio.integration.test.ts` — a SoundFont failure never takes down the
native engine and never loses Composition data.

The structural claims — four Wheels, three Heads each, four routed Instruments
including exactly one SoundFont — are asserted in
`src/test/fixtures/compositions.test.ts`. What cannot be verified in this
repository is the *sound* of a real bank, because there is no bank to load.

## Benchmarks

See [BENCHMARKS.md](BENCHMARKS.md) for the recorded budgets, what they assert,
and the reference machine.
