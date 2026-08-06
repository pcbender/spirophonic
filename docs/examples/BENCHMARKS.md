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

## Known costs not yet budgeted

- **Compilation runs on the render thread.** The app compiles in a synchronous
  `useMemo`, so the ~500 ms above is ~500 ms of blocked UI on every edit of the
  concurrent-Wheels reference. Moving compilation off the render thread is the
  fix; no budget here will catch it, because the work itself is not the problem.
- **Bundle size.** The production chunk is ~606 kB minified, over Vite's 500 kB
  advisory. Lazy-loading the SoundFont path is the obvious lever.
- **Sound-bank initialization and offline render memory** are listed as
  benchmark subjects in the MG-21 contract but have no checked-in budget. Both
  need a real SF2 bank to measure, and none ships with this repository. See the
  packet-close audit in the build plan.
