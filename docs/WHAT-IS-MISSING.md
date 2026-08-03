# What is missing: ratio, tuning, and melodic line

Status: **open exploration.** Not a plan, not approved, not a contract.

This is a thinking document. It records a gap noticed after the sound and MIDI
work landed, and one small experiment that would test whether the intuition is
real. Nothing here should be built as specified — the experiment at the end is
meant to be run first, and to be allowed to fail.

Contrast with [SOUND-AND-MIDI-DESIGN.md](SOUND-AND-MIDI-DESIGN.md), which *is*
a contract: an agent follows that one. This one is for deciding what to do next.

The code references below were accurate at the time of writing. Re-check them
before acting on any of it.

## The observation

Spirophonic composes now: a curve produces onsets, the onsets become MIDI and
Strudel and browser audio, and the three agree. It works, and something is
still absent. Michael put it as "the ratios, the relationships, the curves of
the lines and the melody lines."

That intuition points at something specific.

## The gap

`lissFreqX` and `lissFreqY` decide the picture and the rhythm — three crossings
against two. Pitch is then chosen somewhere else entirely, in `noteFor`
(`src/core/voices.ts:55`): a scalar is sampled off the curve (radius, angle, x,
or y), normalized, scaled across a span of octaves, and snapped to **a scale
chosen from a dropdown** by `quantizeToScale`.

**The ratio never reaches the pitch.** A 3:2 lissajous draws a perfect fifth
and does not sound one. The most musical fact in the model is spent on geometry
and rhythm, then discarded before a single note is chosen.

## Why the ratio is already the interval

A lissajous figure at ratio a:b is not *like* an interval. It is what two
oscillators at a:b look like plotted against each other — the same mathematics
in a different projection. Frequency ratio and figure are one fact.

The correspondence runs deeper than the name:

```text
A curve closes when its ratio is rational.
An interval is consonant when its ratio is rational.
An irrational ratio never closes, and the tone beats.
```

And the code already computes this. `getCycleEnd` (`src/core/trochoid.ts:21`)
takes `greatestCommonDivisor(fixed, moving)` to find where the curve closes;
the lissajous branch in `src/core/curves.ts:62` does the same with
`TAU / greatestCommonDivisor(a, b)`. Reducing a ratio by its GCD is exactly how
`6:4` becomes `3:2`. **The musical fact is already being calculated, and used
only to decide how long to draw.**

Wiring that through is a short connection.

## Three more, in order of how much they would change

**Pitch is sampled rather than drawn.** Notes are read at onsets
independently; nothing knows a line is moving. The one moment that felt
genuinely musical was the harmonograph pad coming out `10 9 7 ... 7 9` — a
contour that rose and fell. That was an accident of the palindrome that closes
a damped curve, not anything designed. A melody is a curve, and right now
curves are sampled instead of followed.

**Voices share a bar but not a tuning.** Each carries its own root and scale
(`PitchOptions` in `src/core/model.ts`). Parts derived from one generator at
related ratios would be consonant by construction — counterpoint falling out of
the geometry instead of being arranged on top of it.

**Nothing develops.** One bar, repeated. The only place time changes the
relationship is harmonograph damping, and that is the most musical parameter in
the application. Probably not a coincidence.

## The reframe

From [VISION.md](VISION.md):

> A cyclic relationship trace and a musical pattern can be siblings, not
> translations.

What exists is a good **translation**. Geometry is primary and music is
measured off it; every arrow in the architecture points one way:

```text
now         relationship -> geometry -> points -> events -> notes

siblings    relationship -> geometry -> curve
                         -> tuning   -> intervals
```

Siblinghood would mean a relationship engine emitting ratios, phase, and speed,
with a geometry reader and a tuning reader hanging off it, neither derived from
the other. The shape and the interval would be one fact seen twice.

Worth being clear that the current design is not wrong. Sonification was the
right thing to build first: it is concrete, testable, and it produced a working
instrument. The question is whether the next step continues it or steps sideways.

## The experiment

Small, self-contained, and cheap to abandon. One voice, one new pitch mode,
nothing else disturbed.

Give a voice a pitch source that ignores its scale and takes its interval from
the curve's own ratio: `lissFreqX : lissFreqY` against the root, compounding by
octave as the contour rises. Then change 3:2 to 5:4 and listen.

The figure should tighten *and* the interval should narrow from a fifth to a
major third, **together**, because they are the same number.

- If that lands — one ratio visibly and audibly moving one thing — the
  intuition is real and the tuning layer is worth designing properly.
- If it sounds arbitrary, the idea needs a different shape, and that will have
  been learned in an afternoon rather than a redesign.

Run it before specifying anything further.

## Open threads not resolved here

- Just intonation drifts against equal temperament. Does a ratio-tuned voice
  play alongside a scale-quantized one, or does the whole composition have to
  commit to one tuning?
- MIDI carries equal-tempered note numbers. Ratio tuning needs pitch bend, or
  MPE, or an accepted approximation. Preview and Strudel have no such limit,
  which would break the agreement the three exports currently hold.
- Which ratio does a spirogram offer? `fixedRadius : movingRadius` reduced —
  180:65 is 36:13, which is not a interval anyone wants. Lissajous and rose
  carry small whole numbers naturally; the spirogram may not suit this at all.
- Does the tuning follow the ratio, or the *closure* — the number of lobes,
  which is what the ear actually counts?
