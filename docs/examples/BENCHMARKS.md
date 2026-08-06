# Release benchmarks

## What these assert, and why

The budgets checked into `src/**/*.bench.test.ts` are **work counts, not
timings**. Encounter and event counts are exact functions of a Composition and a
request, so they are identical on every machine; when one moves, the geometry,
the selection logic, or the interpretation changed. That is the regression worth
failing a build over, and it fails the same way on a laptop and in CI.

Wall-clock time is measured and reported, but only checked against a
deliberately loose ceiling (12 s, roughly ten times the slowest reference
measurement). A budget tight enough to be interesting on the reference machine
would fail on a loaded CI box for reasons that have nothing to do with this
repository — and a benchmark that fails for unrelated reasons stops being read.
The numbers below are the baseline; treat a large move here as the signal, and
the checked-in assertions as the guard against catastrophe.

Where a benchmark can assert *shape* rather than a constant, it does: growth
must stay linear in window length, Boundary count, and Head count, and the trace
index must keep beating a linear scan by an order of magnitude and widen that
gap as the Trace grows. Those hold on any machine.

## Reference machine

| | |
| --- | --- |
| CPU | AMD Ryzen 9 7900X, 12 cores / 24 threads |
| Node | v20.20.2 |
| OS | Linux 6.18 (WSL2) |
| Recorded | 2026-08-06 |

## Compilation budgets

`src/core/performance.bench.test.ts`, 8 s window at 240 Hz scan rate.

| Composition | Encounters | Events | Elapsed |
| --- | --- | --- | --- |
| ring and spoke | 55 | 50 | ~40 ms |
| multi-Head Wheel | 133 | 118 | ~140 ms |
| concurrent Wheels | 850 | 161 | ~500 ms |
| showcase | 850 | 161 | ~500 ms |
| seeded variation | 853 | 161 | ~500 ms |
| relation harmony | 850 + 798 relation | 161 | ~740 ms |

Encounter counts are invariant across 120, 240, and 480 Hz scan rates. Sample
rate is a detection setting, not a musical one; if a rate change moves the
events, crossing refinement stopped converging.

### Growth in window length

| Window | Encounters | Elapsed |
| --- | --- | --- |
| 4 s | 430 | ~230 ms |
| 8 s | 850 | ~480 ms |
| 16 s | 1719 | ~1030 ms |

Doubling the window roughly doubles the work. A quadratic regression would show
as a ratio near four, and the benchmark asserts the ratio stays in [1.8, 2.2].

## Encounter detection

`src/core/encounters.bench.test.ts`. Growth is asserted to stay near linear in
both Boundary count and Head count — four times the Heads must cost well under
four times the work squared.

The 10,000-Encounter cap is checked by lowering it rather than by building a
Composition dense enough to reach it naturally. A 60-ring Composition over 32 s
does saturate the cap, but takes about 14 s to compile, which would make the
benchmark the slowest thing in the suite while testing the same branch.

**That 14 s figure is itself worth knowing:** a sufficiently dense Composition is
slow enough to be unusable, and the cap plus its diagnostic is what keeps it from
hanging the editor silently.

## Trace retention and indexing

`src/core/traceEncounters.bench.test.ts`, 4 s window.

| Measure | Value |
| --- | --- |
| Retained segments per observing Head | ~480 at 120 Hz observation |
| Trace Encounters, reference fixture | 4446 |
| Index candidates vs linear scan | under 10% |

The reference fixture has only the leading Head of each Wheel observing. With
all twelve observing, a spirogram re-crosses its own path often enough to
saturate the 10,000 cap, which would make the benchmark measure the limit rather
than the indexing work underneath it.

The index's value is asserted as a ratio, not a duration: candidates returned
divided by the segments a linear scan would examine. A linear scan's ratio is
1.0 and stays flat; the index's must be below 0.1 **and must fall further as the
Trace grows**. Both checks fail if the grid degenerates.

## Sound-bank initialization and SoundFont render memory

`src/audio/soundbank.bench.test.ts`, against a real 890-byte SoundFont generated
by `spessasynth_core` (Apache 2.0, already a dependency — no bank is downloaded
or committed).

| Measure | Value |
| --- | --- |
| Generated bank | 890 bytes, one `Saw Wave` preset |
| Container recognition | 12-byte header read, constant in bank size |
| Parse to presets | 1 preset, 1 instrument, 1 sample |
| Vault re-import | digest comparison only; no second write |
| Bank share of a 10 s stereo render | under 0.1% |

Worklet startup and voice rendering need a real `AudioWorklet` and are covered
in the browser suite, which imports this bank through the actual UI in Chromium
and Firefox.

The bank's 890-byte size is asserted. If `spessasynth_core` changes it, the
numbers here need rechecking rather than drifting silently.

## Bundle size

| | Minified | Gzipped |
| --- | --- | --- |
| Main chunk | 401.00 kB | 116.73 kB |
| SpessaSynth (lazy) | 205.96 kB | 75.21 kB |

SpessaSynth was 207 kB of a single 606 kB chunk until it was moved behind a
dynamic import. It now loads only when a Composition actually uses a SoundFont
Instrument, and the main chunk is under Vite's 500 kB advisory.

## Compilation is off the render thread

`src/workers/performanceWorker.ts` compiles in a Web Worker. The compiler is
pure and has no DOM, audio, or storage dependency, which is what makes this
possible: the worker imports `src/core` and nothing else, so the dependency
still points into core rather than out of it.

Measured in Chromium by recording `requestAnimationFrame` deltas across five
consecutive tempo edits of the concurrent-Wheels reference:

| | Longest frame gap |
| --- | --- |
| Compiling on the render thread | **128.8 ms** |
| Compiling in a worker | **22.1 ms** |

The browser check asserts under 100 ms, which is loose enough to survive a
loaded CI box and still fails if the work moves back onto the main thread —
verified by moving it back and watching it fail.

Two things this cost:

- The last good performance stays on screen while a new one compiles, so an
  edit never blanks the canvas. `compiling` appears in the Transport status.
- The performance and the Composition can now disagree while a compile is in
  flight. The hook therefore returns the Composition the performance was
  compiled *from*, and everything that consumes the performance — scheduling,
  export, recording — reads Instruments and Transport from that document.
  Pairing new Instruments with old events made the scheduler reject every event
  whose Instrument id did not exist yet, which is exactly the bug the browser
  suite caught.

## Known costs not yet budgeted

- **Bundled sound bank download.** The 38 MB MuseScore General bank is fetched
  twice over: once into `public/soundbanks/` at build time by
  `scripts/fetch-soundbank.mjs`, and once from there into the browser's vault on
  idle. Both verify the same SHA-256, and neither is committed to this
  repository. Nothing waits on either: every default Instrument is native.
  There is no budget on the download itself, which is bounded by the network
  rather than by anything here.
