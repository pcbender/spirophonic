# What is missing: ratio, tuning, and melodic line

Status: **open exploration, partly answered.** Still not a plan, not approved,
not a contract.

This began as a thinking document: a gap noticed after the sound and MIDI work
landed, and one small experiment to test whether the intuition was real. Since
then the experiment has been run, and most of what it argued for has been built.

This revision records **what was answered and what was not**, so the document
stops describing an application that no longer exists. It keeps its original
character: the parts still open are still open questions, not specifications.

Contrast with [SOUND-AND-MIDI-DESIGN.md](SOUND-AND-MIDI-DESIGN.md), which *is*
a contract: an agent follows that one. This one is for deciding what to do next.

## Where things stand

| The original claim | Now |
|---|---|
| The ratio never reaches the pitch | **Answered.** `tuned-ratio` takes its interval from a Wheel's own motion. |
| Pitch is sampled rather than drawn | **Answered.** `melodic-contour` walks the scale as a line. |
| Voices share a bar but not a tuning | **Answered.** Tuning contexts are shared and referenced per Part. |
| Nothing develops | **Still open.** Variation randomises; it does not develop. |
| Geometry is primary, music measured off it | **Partly.** A tuning reader exists, but the architecture is unchanged. |

Every code reference in the original was stale: `voices.ts` and `model.ts` no
longer exist, and `noteFor`/`PitchOptions` were replaced by `mapEncounterPitch`
and `PitchMapping` in `src/core/parts.ts`. The paths below are current as of
this revision — re-check them before acting, exactly as before.

## The experiment, and its result

The experiment proposed here was: give a voice a pitch source that ignores its
scale and takes its interval from the curve's own ratio, then change 3:2 to 5:4
and listen. The figure should tighten *and* the interval should narrow from a
fifth to a major third, **together**, because they are the same number.

That is now `tuned-ratio` with a `wheel-motion` source
(`resolveRatioSource`, `src/core/tuning.ts:118`). Compiling the same Composition
at four ratios and reading the sounding frequency against the root:

```text
figure 3:2  ->  sounding ratio 1.5000     a perfect fifth
figure 5:4  ->  sounding ratio 1.2500     a major third
figure 6:4  ->  sounding ratio 1.5000     reduces to 3:2, like the figure
figure 2:1  ->  sounding ratio 1.0000     the octave folds to unison
```

**It lands.** 3:2 sounds an exact fifth and 5:4 an exact third — not an
approximation of one. The third line is the part worth dwelling on: `6:4`
reduces to `3:2` and sounds a fifth, because `reduceRatio` divides by the GCD.
A 6:4 figure *is* a 3:2 figure, and it now sounds like one. The prediction that
these are one fact seen twice is borne out in the arithmetic.

One correction to the original, which claimed the musical fact "is already being
calculated" for closure and merely needed wiring through. It is calculated
twice. `reduceRatio` has its own private `greatestCommonDivisor`
(`src/core/tuning.ts:22`), and the `getCycleEnd` the original cited no longer
exists — `trochoid.ts` still exports a `greatestCommonDivisor` that nothing
imports. The arithmetic agrees; the code does not share it. That is a small
piece of tidying rather than a design flaw, but it means the connection was
built fresh, not wired through.

The fourth line is a wrinkle rather than a success. A 2:1 figure is an octave,
and with `octaveFold` on it folds to 1.0 and sounds a unison. Octave folding is
right for keeping high degrees in range and wrong for the one interval that
*is* an octave. Nobody has decided what should happen there.

So: the intuition was real, and the tuning layer was worth designing. It was
designed. What follows is what that left behind.

## What got built

**Ratio to pitch.** `tuned-ratio` resolves an interval from an explicit
numerator and denominator, or from a Wheel's motion. Lissajous offers
`frequencyX:frequencyY`, rose offers `numerator:denominator`, both reduced by
their GCD.

**The spirogram question, decided.** The original asked which ratio a spirogram
offers and doubted `180:65 = 36:13` was an interval anyone wants. The code
agrees and refuses it outright, in those terms: *"Spirogram radii describe a
rolling relationship, not a frequency ratio. Use an explicit ratio, or a
Lissajous or rose Wheel."* A good outcome — the doubt was correct, and it is
now enforced rather than left to be discovered.

**A melodic line.** `melodic-contour` walks the scale rather than sampling it:
the source drives direction and the line steps, bounded by a low and high
degree. The harmonograph pad that came out `10 9 7 ... 7 9` — the accident that
prompted this section — is now something you can ask for.

**Shared tuning.** A tuning context carries a root frequency and a system,
either `equal-temperament` with a division count or `rational` with a maximum
denominator. Parts reference one by `tuningContextId`, so Parts derived from one
generator at related ratios are consonant by construction.

**All of it reachable.** Every mapping above is in the Parts panel. That was not
true until recently; they existed in the format and only a JSON round trip
could select them.

## Open threads, revisited

Three of the four original threads have answers. They are recorded here rather
than deleted, because the answers are design decisions someone may want to
revisit.

**Does a ratio-tuned voice play alongside a scale-quantized one?** *Yes.*
`tuningContextId` is per Part (`src/core/composition.ts:507`), so one Part can
be rational while another is equal-tempered, in the same Composition. Nothing
forces a whole piece to commit. Whether that *sounds* good at length is
untested — it is possible, not validated.

**Does ratio tuning break the three-way export agreement?** *No.* MIDI writes
the nearest semitone plus a pitch bend on its own channel
(`src/export/midiExport.ts`), and emits a diagnostic naming the error in
semitones when a bend exceeds the declared range. Pitch bend was the choice;
the honesty about what it cannot represent is the part worth keeping.

**Which ratio does a spirogram offer?** *None* — see above.

**Does the tuning follow the ratio, or the closure?** **Still open, and still
the most interesting question here.** The implementation follows the ratio. The
ear arguably counts lobes, which is the closure. For the figures tested these
coincide; the original asked whether they always do, and nothing since has
answered it.

## Still missing

**Nothing develops.** One loop, repeated. Variation adds seeded randomness in
three layers — initial conditions, interpretation, performance — and randomness
is not development. The observation that harmonograph damping is the most
musical parameter in the application, *because* it is the only place time
changes the relationship, still stands and is still unaddressed. If one thread
here is worth pulling next, it is this one.

**The reframe is unresolved.** From [VISION.md](VISION.md):

> A cyclic relationship trace and a musical pattern can be siblings, not
> translations.

A tuning reader now exists beside the geometry reader, which is a step toward
siblinghood. But the architecture is unchanged: Encounters are still produced by
geometry and Parts still interpret them, so every arrow still points one way.

```text
now         relationship -> geometry -> Encounters -> Parts -> notes
                                     -> tuning ---------------^

siblings    relationship -> geometry -> curve
                         -> tuning   -> intervals
```

What was added is a second reader hanging off the *geometry*, not off the
relationship. `tuned-ratio` reaches back past the Encounter to ask a Wheel for
its ratio, which works and is slightly against the grain of the model — the one
place a Part looks at geometry rather than at the fact geometry produced.

Whether that is a seam worth opening into a real relationship engine, or a
useful shortcut that should stay a shortcut, is the question the original
document asked and this revision cannot answer either. The current design is
still not wrong. Sonification was still the right thing to build first.

## Suggested next experiment

In the same spirit as the original — small, self-contained, cheap to abandon.

Take the `2:1` wrinkle. Decide what an octave figure should sound, implement
only that, and see whether the answer generalises. If "fold every ratio except
the octave" feels arbitrary, the fold is probably the wrong primitive and the
tuning context wants a range rather than a fold. That is an afternoon, and it
would be learned before anything larger is specified.
