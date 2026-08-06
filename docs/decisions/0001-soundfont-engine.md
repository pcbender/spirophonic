# ADR 0001: Browser SoundFont engine

- Status: Accepted
- Date: 2026-08-05
- Packet: MG-10

## Decision

Use [`spessasynth_lib` 4.3.12](https://www.npmjs.com/package/spessasynth_lib)
with the lockfile-resolved `spessasynth_core` 4.3.16 and its
`WorkletSynthesizer` for interactive SF2/SF3 playback. Keep the existing native
synth and drum engine as the no-bank fallback.

The package's matching `spessasynth_processor.min.js` is copied automatically
by `scripts/sync-spessasynth-worklet.mjs` before Vite development and production
builds. The generated `public/vendor/spessasynth_processor.min.js` is ignored;
it is never edited or committed. Vite copies it to the same path in `dist/`.
The source, public, and built files measured 397,904 bytes and had identical
SHA-256 digest
`4a6e2bf7ca16a510841f467f4563dcf9155c328ff6eef808a508def280de709e`.
This follows the library's recommendation to automate the package-matched
[AudioWorklet copy](https://spessasus.github.io/spessasynth_lib/synthesizer/importing-the-worklet/)
and introduces no runtime CDN requirement.

Sound-bank bytes remain user-local in IndexedDB, keyed by SHA-256 digest.
Composition JSON stores only `SoundBankReference` metadata and a digest. A
missing local digest is therefore an explicit relink condition, not embedded
binary data or silent network access.

## Why this engine

The selected API provides the capabilities needed by the domain model without
putting browser or audio concepts in `src/core/`:

- SF2, SF3, and DLS loading;
- preset enumeration with program, bank MSB/LSB, and drum identity;
- several MIDI channels and overlapping notes;
- absolute AudioContext-time note scheduling;
- SoundFont manager add/delete operations;
- reverb, chorus, and MIDI controller support for MG-11; and
- explicit synthesizer destruction and AudioContext disposal.

The project already owns canonical musical events and an `InstrumentEngine`
boundary. SpessaSynth therefore remains a replaceable browser adapter rather
than becoming a domain dependency.

## Probe method

The Vite-served `runSoundFontProbe` registered the copied worklet, initialized
a fresh synthesizer, enumerated presets, and scheduled:

- MIDI 60 on channel 0 using `Grand Piano` (bank 0:0, program 0);
- MIDI 67 on channel 1 using `Piano & Str.-Fade` (bank 11:0, program 0),
  overlapping the first note; and
- MIDI 36 on channel 9 using `Standard 1 Kit` (drum bank 120:0, program 0).

All events were submitted 150 ms ahead using explicit AudioContext times. Each
run waited through note-off, stopped voices, destroyed the worklet synthesizer,
and closed its AudioContext. Missing banks and malformed RIFF containers were
also exercised. Browser page-error collection was empty in every completed
run.

The test banks were temporary local probe assets and are not committed:

| Format | Source | Bytes | SHA-256 | Presets |
| --- | --- | ---: | --- | ---: |
| SF2 | [GeneralUser GS official repository](https://github.com/mrbumpy409/GeneralUser-GS) | 32,319,396 | `9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe` | 287 |
| SF3 | [SpessaSynth bundled GeneralUser GS](https://github.com/spessasus/SpessaSynth/tree/master/soundfonts) | 8,423,728 | `e2ed326ff44d15f78f2fdc72403b6fa6b77ee7266d3aad0d2198bc95797bc66c` | 287 |

## Results

These are single headless runs on the development machine, useful for
compatibility and order-of-magnitude latency rather than as release benchmarks.

| Browser | Bank | Initialize | Load | Dispose | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Chromium 147.0.7727.15 | SF3 | 79.2 ms | 43.9 ms | 0.4 ms | pass |
| Chromium 147.0.7727.15 | SF2 | 45.3 ms | 65.5 ms | 0.3 ms | pass |
| Firefox 148.0.2 | SF3 | 100 ms | 110 ms | 1 ms | pass |
| Firefox 148.0.2 | SF2 | 107 ms | 252 ms | 1 ms | pass |

Both browsers reported 287 presets, scheduled the two overlapping pitched
voices and drum voice, rejected missing/corrupt inputs, and disposed cleanly.

Chromium's non-standard `performance.memory.usedJSHeapSize` reported 18.2 MB
before and after each load; its coarse value did not expose AudioWorklet heap or
sample memory and must not be treated as bank memory usage. Firefox exposes no
equivalent API and reported memory as unavailable. MG-21 should use browser
process metrics for meaningful memory budgets.

## Failure behavior and known limits

- Upstream 4.3.12 logs a corrupt-RIFF error inside the worklet but can leave
  `addSoundBank()` pending. Spirophonic validates the RIFF/RIFS container and
  `sfbk`/`DLS ` form type on the main thread so corrupt inputs fail visibly
  before reaching that path.
- A valid RIFF can still contain malformed SoundFont structures. MG-11 must
  present load failures and timeouts as errors, never successful silence.
- Large banks have browser-dependent memory ceilings. No claim is made for
  multi-gigabyte banks, mobile devices, or Safari in this packet.
- `spessasynth_lib` declares `spessasynth_core` as `latest`; reproducibility
  therefore depends on the committed npm lockfile. Any library or core update
  requires a new worklet sync plus the complete SF2/SF3 browser probe.
- Headless runs prove worklet initialization, preset routing, scheduled
  note-on/note-off traffic, and clean browser state. Human listening and device
  latency remain release-level checks.

## Licensing and redistribution checklist

The code library and every bank are separate licensing decisions.
`spessasynth_lib` and `spessasynth_core` are Apache-2.0. That license does not
grant rights to arbitrary SoundFont samples.

GeneralUser GS uses its own permissive
[GeneralUser GS v2 license](https://github.com/mrbumpy409/GeneralUser-GS/blob/main/documentation/LICENSE.txt).
It was used locally for this probe. Before any bank is bundled or distributed:

1. record the exact source URL, version, download date, byte length, and digest;
2. retain the complete bank license and required attribution with local
   metadata;
3. verify both the complete-work terms and the provenance/terms of contained
   samples;
4. decide explicitly whether redistribution, modification, and commercial use
   are allowed for that exact bank;
5. include required license and notice files in every distributed bundle;
6. never infer redistribution rights from a public download URL; and
7. for user-supplied banks, store bytes locally and export only references
   unless the user explicitly requests and is authorized to make a bundle.

## Fallback plan

If the WorkletSynthesizer proves unreliable for a supported browser, first
evaluate SpessaSynth's `WorkerSynthesizer`, which keeps the same bank and MIDI
semantics while avoiding documented Chromium audio-engine issues. If the
SpessaSynth family cannot meet MG-11's concurrency or stability requirements,
evaluate a pinned FluidSynth WebAssembly adapter behind the existing
`InstrumentEngine`; account for its binary size, worklet integration, and LGPL
obligations before changing this decision.
