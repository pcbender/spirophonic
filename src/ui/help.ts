/**
 * Hover help for every control, in one place.
 *
 * These are the manual's sentences, shortened to fit a tooltip. They live in a
 * single module rather than inline in the panels for one reason: this
 * vocabulary is shared with `docs/MANUAL.md`, and two copies of an explanation
 * drift apart. One file is something a person can read end to end and check
 * against the manual; a hundred string literals scattered across ten panels is
 * not.
 *
 * The rule for writing one: say what the control does *and* what it affects,
 * in the vocabulary of the model. A tooltip that restates its own label — "Name:
 * the name" — costs a hover and returns nothing, so it is better omitted.
 */
export const help = {
  // Transport
  'transport.play': 'Start playback from the current position, or pause it.',
  'transport.stop': 'Stop and return the playhead to the start of the loop.',
  'transport.loop':
    'Repeat the loop window forever. Off, playback stops at the end of the window.',
  'transport.position': 'Position in the loop window. Drag to seek.',
  'transport.status':
    'Playhead position, and how many notes the current loop window produces.',

  // Composition
  'composition.name':
    'Names the Composition. Used for exported filenames and in the discard prompt.',
  'composition.tempo':
    'Beats per minute. Wheel rates are counted in beats, so tempo scales the whole piece at once.',
  'composition.beatsPerBar': 'Beats in a bar. Affects quantization and MIDI export.',
  'composition.beatUnit': 'Which note value counts as one beat.',
  'composition.loopStart': 'Where the loop window begins, in beats.',
  'composition.loopLength':
    'How long the loop window is. Only Encounters inside the window are heard, so this decides how much of a curve you ever hear — lengthen it if an edit seems to do nothing.',

  'composition.viewZoom':
    'How large the geometry is drawn. 1 fits it to the canvas; 2 draws it twice as big. Affects the picture only — never the notes.',
  'composition.pitchReference':
    'The size Spatial pitch measures positions against, in world units. Set it near the size of your geometry: far below it every Encounter normalises to the same value and picks the same note. Affects the notes only — never the picture.',

  // Composition tree
  'tree.addWheel': 'Add a Wheel, carrying one Head, and select it.',
  'tree.wheelEnabled':
    'Include this Wheel in the performance. Off, its Heads produce no Encounters.',
  'tree.headEnabled': 'Include this Head in the performance.',
  'tree.traceVisible':
    'Draw this Head’s Trace on the canvas. Independent of whether the Head plays.',
  'tree.move': 'Reorder. Order affects layering on the canvas, not the sound.',
  'tree.duplicateWheel': 'Copy this Wheel and all of its Heads.',
  'tree.duplicateHead': 'Copy this Head onto the same Wheel.',
  'tree.addHead':
    'Add a Head to this Wheel. It inherits the Wheel’s clock, so it shares its timing.',
  'tree.removeWheel':
    'Remove this Wheel. Its Heads go with it, and Parts that named them are updated — you are asked first.',
  'tree.removeHead': 'Remove this Head. You are asked first if anything references it.',
  'tree.removePart': 'Remove this Part.',
  'tree.partEnabled':
    'Include this Part. A disabled Part is never heard and cannot solo.',
  'tree.mute': 'Silence this Part, unless some other Part is soloed.',
  'tree.solo':
    'Hear only soloed Parts. Solo outranks mute: a Part that is both still sounds.',

  // Wheel
  'wheel.name': 'Names this Wheel in the tree and in Part filters.',
  'wheel.motion':
    'Which curve family this Wheel draws. Changing it resets the motion parameters and every Head’s attachment to that family’s defaults.',
  'wheel.cycles':
    'Numerator of the rate: this many full cycles per the beats below.',
  'wheel.cycleBeats':
    'Denominator of the rate: the cycles above happen across this many beats. A ratio rather than a frequency, so Wheels stay locked to each other and to the bar at any tempo.',
  'wheel.phase': 'Rotate the starting point. 0.25 starts a quarter turn in.',
  'wheel.direction': 'Travel forward or in reverse around the curve.',
  'wheel.fixedRadius': 'Radius of the fixed circle the moving circle rolls against.',
  'wheel.movingRadius':
    'Radius of the rolling circle. Its ratio to the fixed radius decides how many lobes the curve has and when it closes.',
  'wheel.rotation':
    'Roll the moving circle inside the fixed one (hypotrochoid) or outside it (epitrochoid).',
  'wheel.frequencyX': 'Oscillation rate along X. Its ratio to Y decides the figure.',
  'wheel.frequencyY': 'Oscillation rate along Y. Its ratio to X decides the figure.',
  'wheel.delta':
    'Phase offset between the X and Y oscillations, in radians. Turns a line into an ellipse and back.',
  'wheel.numerator': 'Numerator of the rose ratio; with the denominator it sets the petal count.',
  'wheel.denominator': 'Denominator of the rose ratio. An irrational ratio never closes.',
  'wheel.symmetry': 'How many-fold the symmetry is. 6 gives a six-sided figure.',
  'wheel.n1': 'Superformula exponent 1. Controls overall roundness.',
  'wheel.n2': 'Superformula exponent 2. Bulges or pinches the lobes.',
  'wheel.n3': 'Superformula exponent 3. Bulges or pinches the lobes the other way.',
  'wheel.damping':
    'How fast the pendulum loses energy. Higher values spiral inward sooner.',

  // Head and Trace
  'head.name': 'Names this Head in the tree and in Part filters.',
  'head.phase':
    'Offset this Head against its Wheel. Two Heads half a turn apart sit opposite each other.',
  'head.offsetX': 'Shift this Head along X, in world units.',
  'head.offsetY': 'Shift this Head along Y, in world units.',
  'head.penOffset':
    'Distance from the rolling circle’s centre — the pen’s position in the spirograph.',
  'head.scaleX': 'Amplitude of this Head’s X oscillation.',
  'head.scaleY': 'Amplitude of this Head’s Y oscillation.',
  'head.radiusScale': 'Overall size of the curve this Head traces.',
  'head.amplitudeScale': 'Overall size of the pendulum swing.',
  'head.traceColor': 'Colour of this Head’s Trace on the canvas.',
  'head.traceWidth': 'Line width of the Trace.',
  'head.traceHistory':
    'How many seconds of the past stay drawn behind the Head.',
  'head.observe':
    'Let this Head’s own path be crossed, producing trace-crossing Encounters. Two Heads must observe before either can cross the other, and a Part has to accept the trace kind before it is heard.',
  'head.retention':
    'Window follows the drawn trace history; Full remembers the whole loop window.',
  'head.observationRate':
    'How often the path is sampled for crossing tests. Higher is more precise and more expensive.',
  'head.maxSegments': 'Hard cap on stored path segments, to bound the cost.',
  'head.allowSelf':
    'Let this Head cross its own Trace, not only the Traces of other Heads.',

  // Fields
  'field.add':
    'Add a Field of this kind, carrying one Boundary to start with.',
  'field.enabled': 'Include this Field in crossing detection.',
  'field.name': 'Names this Field, and prefixes its Boundaries in Part pickers.',
  'field.centerX': 'Field centre along X, in world units.',
  'field.centerY': 'Field centre along Y, in world units.',
  'field.rotation':
    'Rotate the whole Field, in radians. Absent on rings and bands, which are rotationally symmetric.',
  'field.motion': 'Whether and how this Field moves over time.',
  'field.turnsPerSecond':
    'Rotation speed in wall-clock time. Drifts against the beat by design — use transport-rotating to stay in step.',
  'field.turnCycles': 'Numerator of the rotation rate, in musical time.',
  'field.turnBeats':
    'The turns above happen across this many beats, so the Field stays locked to the tempo.',
  'field.attachedWheel': 'Which Wheel this Field rides.',
  'field.followRotation':
    'Inherit the attached Wheel’s rotation as well as its position.',
  'field.addBoundary':
    'Add another Boundary, placed clear of the ones already here.',
  'field.moveField': 'Reorder this Field.',
  'field.removeField': 'Remove this Field and every Boundary in it.',

  // Boundaries
  'boundary.enabled': 'Include this Boundary in crossing detection.',
  'boundary.name': 'Names this Boundary in Part pickers.',
  'boundary.move': 'Reorder. Order sets the degree used by Boundary-degree pitch.',
  'boundary.remove': 'Remove this Boundary.',
  'boundary.radius': 'Distance from the Field centre. A Boundary outside a Head’s reach is never crossed.',
  'boundary.angle': 'Direction of the spoke from the Field centre, in radians.',
  'boundary.angularWidth':
    'Full angular width of the wedge. Zero preserves the legacy crossing ray; a positive width makes one outer gate.',
  'boundary.length':
    'Distance from the Field centre to the Spoke’s distal vertices. The connecting outer edge is part of a wedge gate.',
  'boundary.eccentricity': 'How far from circular the ellipse is. 0 is a circle.',
  'boundary.innerRadius': 'Inner edge of the band. Crossing either edge is an Encounter.',
  'boundary.outerRadius': 'Outer edge of the band.',
  'boundary.axis': 'Whether this grid line runs along X or Y.',
  'boundary.offset': 'Distance of the grid line from the Field centre.',
  'boundary.startRadius': 'Radius where the spiral begins.',
  'boundary.growthPerTurn': 'How much the spiral’s radius grows each full turn.',
  'boundary.turns': 'How many turns the spiral makes before it ends.',

  // Parts
  'part.add':
    'Add a Part: selects Encounters and turns them into notes. It starts listening to every Wheel and Head.',
  'part.addRelation':
    'Add a detector that watches Heads against each other rather than against Boundaries.',
  'part.addControl':
    'Add a continuous lane for modulation, driven by a Relation rather than producing notes.',
  'part.addTuning':
    'Add a shared pitch reference, so several Parts land in the same key.',
  'part.enabled': 'Include this Part. A disabled Part is never heard and cannot solo.',
  'part.name': 'Names this Part in the tree.',
  'part.remove': 'Remove this Part.',
  'part.kinds':
    'Which kinds of Encounter this Part turns into notes. Boundary crossings are the default; trace crossings need Observe Trace on a Head, and the alignment kinds need a Relation. Check none and it accepts every kind.',
  'part.wheels':
    'Which Wheels this Part hears. Check none and it hears every Wheel — the line below always says which.',
  'part.heads':
    'Which Heads, among those on the Wheels above. Check none and it hears all of them.',
  'part.boundary':
    'Listen to one Boundary, or to all of them. One Boundary per Part is how you give each its own line.',
  'part.direction':
    'Listen only to crossings going one way — inward, outward, or around — or to any of them.',
  'part.instrument': 'Which Instrument renders this Part’s notes.',
  'part.pitchMapping':
    'How an Encounter chooses a pitch. Fixed MIDI repeats one note, giving the rhythm alone. Boundary degree lets which Boundary was crossed pick the note. Spatial and Contour read where the Encounter happened, Melodic line walks the scale instead of sampling it, and the ratio mappings turn a Wheel’s own relationship into an interval.',
  'part.pitchSource':
    'Which measurement of the Encounter drives pitch: its x, its y, its distance from centre, or its angle. Angle is the only one independent of Space scale.',
  'part.octaves': 'How many octaves the degrees are spread across.',
  'part.frequencyHz': 'The single frequency every Encounter plays, in hertz.',
  'part.ratioRoot': 'Frequency the ratio is measured from. 261.63 Hz is middle C.',
  'part.octaveFold':
    'Fold every result back into one octave above the root, so high degrees stay in range instead of climbing away.',
  'part.ratioSource':
    'Take the ratio from two numbers you choose, or from a Wheel’s own motion — a 3:2 Lissajous is literally a perfect fifth.',
  'part.ratioNumerator': 'Top of the frequency ratio. 3 over 2 is a perfect fifth.',
  'part.ratioDenominator': 'Bottom of the frequency ratio.',
  'part.ratioWheel':
    'Which Wheel’s motion supplies the ratio. Lissajous and rose Wheels carry one; a spirogram’s radii describe rolling, not frequency.',
  'part.melodyAnchor':
    'Where the line restarts. The walk accumulates, so Never lets it drift and a repeating Wheel produces a line that never repeats. Each bar restarts it at the start degree, making the phrase repeatable.',
  'part.maxStep': 'The largest jump the line may make, in scale steps.',
  'part.directionBias':
    'How strongly the source’s own direction steers the line. 0 wanders; 1 follows the geometry exactly.',
  'part.lowDegree': 'Lowest scale degree the line may reach.',
  'part.highDegree': 'Highest scale degree the line may reach.',
  'part.startDegree': 'Scale degree the line begins on.',
  'part.midiNote': 'The single MIDI note every Encounter plays. 60 is middle C.',
  'part.root':
    'The root note the scale is built on, as a MIDI number — the note name beside the label tracks it. Degree 0 lands here.',
  'part.scale': 'Which scale the degrees land on. Pentatonic minor is the forgiving default.',
  'part.relations':
    'Which Relations this Part fires on. Check none and it hears every Relation of the kinds above.',
  'part.minStrength':
    'Ignore Encounters weaker than this. Strength runs 0 to 1 — a glancing crossing is weak, a square-on one is strong — so this thins a busy Part down to its firmest hits.',
  'part.velocityKind':
    'Where loudness comes from: the force of each Encounter, or one fixed value for every note.',
  'part.velocityValue': 'The MIDI velocity every note is played at, 1 to 127.',
  'part.velocityMin': 'Velocity for the weakest Encounter.',
  'part.velocityMax': 'Velocity for the strongest Encounter.',
  'part.velocityGamma':
    'Bends the curve between the two. 1 is straight; below 1 favours louder, above 1 favours quieter.',
  'part.durationKind':
    'What decides note length: a fixed value, the gap until this Part’s next note, or one exact visit inside a band or wedge.',
  'part.maxBeats':
    'Longest a note may run when its length comes from the gap to the next one — it also ends the final note of the loop.',
  'part.quantizeStrength':
    'How hard onsets are pulled to the grid. 0 leaves the geometry’s own timing; 1 snaps exactly.',
  'part.duration': 'How long each note lasts, in beats.',
  'part.grid':
    'Quantization grid in beats. Onsets are pulled toward it, so crossings land musically.',
  'part.gateModulation':
    'Samples motion between one matched region entry and exit. Samples shape the held note and never create another onset.',
  'part.addGateModulation':
    'Add a saved source-to-target mapping for each complete region-gated note.',
  'part.gateModulationName': 'Names this mapping and its canonical lane.',
  'part.gateModulationSource':
    'Continuous physical measurement sampled while the gate is open. Across wedge runs from one edge to the other.',
  'part.gateModulationTarget':
    'The voice parameter the lane will control. Attack and initial velocity are sampled only at entry.',
  'part.gateModulationRange':
    'Target values produced at normalized source values 0 and 1.',
  'part.gateModulationRate':
    'Deterministic samples per second, independent of display frame rate.',
  'part.gateModulationCurve':
    'Bends the normalized source before mapping it into the target range.',
  'part.gateModulationSmoothing':
    'One-pole smoothing time. Zero follows every saved sample directly.',

  // Relations
  'relation.enabled': 'Include this Relation.',
  'relation.name': 'Names this Relation, and identifies it in Control Parts.',
  'relation.kind': 'What this detector watches for between two Heads.',
  'relation.threshold':
    'How close counts, in the detector’s own units — world distance for conjunction and radial alignment, radians for angular ones.',
  'relation.hysteresis':
    'Dead band around the threshold, so a detector does not chatter when Heads hover right at it.',
  'relation.minSeparation':
    'Shortest time allowed between two firings of this detector.',
  'relation.remove': 'Remove this Relation.',

  // Control Parts
  'control.source': 'Which measurement between the two Heads drives the lane.',
  'control.relation': 'Which Relation supplies the Head pair to measure.',
  'control.rate': 'How often the lane is sampled, in Hz.',

  // Tuning contexts
  'tuning.rootHz': 'Reference frequency the context is built on. 261.63 Hz is middle C.',
  'tuning.system':
    'Equal temperament quantizes to fixed divisions per octave. Rational keeps exact ratios, which is what makes a 3:2 an actual perfect fifth rather than an approximation of one.',
  'part.tuningContext':
    'Which tuning context this Part resolves its ratios against. Only Tuned ratio reads it. Default is C4 at 261.63 Hz in 12-tone equal temperament; add others with Add Tuning.',
  'tuning.name': 'Names this tuning context.',
  'control.name': 'Names this Control Part.',
  /*
   * One string used to serve all three row kinds, and it named no panel and no
   * rail: "the panels on the left" locates nothing when the tree you are
   * reading it in is itself on the left. Each row now names the panel it drives
   * and where that panel is. The Part row says what it does instead of
   * promising an edit surface it does not have.
   */
  'tree.selectWheel':
    'Show this Wheel in the Wheel panel, further down this rail, where its motion, rate, and phase are set.',
  'tree.selectHead':
    'Show this Head in the Head and Trace panel, further down this rail, where its attachment and Trace are set.',
  'tree.selectPart':
    'Highlight this Part. Unlike a Wheel or Head, a Part is not edited through this tree — every Part has its own row in the Parts panel, in the right rail.',
  'tuning.remove': 'Remove this tuning context.',

  // Instruments
  'instrument.addNative':
    'Add this built-in Instrument with playable defaults. It needs no sound bank and appears immediately in every Part’s Instrument picker.',
  'instrument.remove':
    'Remove this Instrument. Refused while any Part still plays through it, and a Composition must keep one.',
  'instrument.name': 'Names this Instrument in Part pickers.',
  'instrument.waveform': 'Oscillator shape. Sine is pure; sawtooth is brightest.',
  'instrument.voice': 'Which drum this Instrument plays.',
  'instrument.gain': 'Output level of this Instrument.',
  'instrument.pan': 'Stereo position. -1 is hard left, 1 is hard right.',
  'instrument.attack': 'Seconds to reach full level after a note starts.',
  'instrument.decay': 'Seconds to fall from full level to the sustain level.',
  'instrument.sustain': 'Level the note holds at after the decay, as a fraction of full.',
  'instrument.release': 'Seconds to fade to silence after a note ends.',
  'instrument.reverb': 'Reverb send for this SoundFont Instrument.',
  'instrument.chorus': 'Chorus send for this SoundFont Instrument.',

  // Variation
  'variation.enable': 'Add controlled randomness, seeded so it stays reproducible.',
  'variation.remove': 'Remove variation and return to the exact unvaried path.',
  'variation.enabled': 'Master switch for all three variation layers.',
  'variation.seed':
    'The same seed with the same Composition gives the same result every time, on any machine.',
  'variation.layerEnabled': 'Apply this layer of variation.',
  'variation.amount': 'How far this layer is allowed to move things.',

  // Recorder
  'recorder.record':
    'Capture the performance from the current position — Encounters and events both, so a run can be replayed exactly rather than recompiled.',
  'recorder.stop': 'End the capture.',
  'recorder.export': 'Download the recording as JSON.',
  'recorder.discard': 'Throw the recording away.',

  // Files and workspace
  'files.new':
    'Start from a clean slate: one Wheel, one Head, one Instrument, no Fields and no Parts.',
  'files.loadExample':
    'Load the reference Composition: four Wheels, twelve Heads, and four Instruments already routed.',
  'files.exportJson':
    'Download the Composition as JSON. Small and readable — this is the thing to keep.',
  'files.importJson':
    'Load a Composition from JSON. It is validated, and rejected with reasons rather than partly applied.',
  'files.exportMidi': 'Download the performed notes as a MIDI file, for a DAW.',
  'files.exportSvg': 'Download the Traces as vector art.',
  'files.copyStrudel': 'Copy the pattern to the clipboard as Strudel code.',
  'files.exportWav':
    'Render what you hear to a WAV file, faster than real time.',
  'files.cancelRender': 'Stop the render in progress.',
  'files.exportBundle':
    'Save the whole project — Composition plus its sound bank references — as one .spirophonic file.',
  'files.importBundle':
    'Open a .spirophonic project file, replacing the current Composition.',
  'files.embedBanks':
    'Copy the sound bank audio into the bundle so it opens on any machine. Much larger file. Without this, the bundle only references banks by digest.',

  // Sound banks
  'dialog.close':
    'Close this dialog and return to the workspace. Nothing is applied on close — every change took effect when you made it.',
  'settings.open':
    'Setup that is not part of the Composition: importing sound banks, recording their licences, relinking and removing them.',
  'bank.manage':
    'Open Settings, where banks are imported, relinked, and removed. Nothing there changes the Composition’s sound on its own.',
  'bank.file': 'Choose an SF2 or SF3 SoundFont to import.',
  'bank.license':
    'Redistribution terms, recorded with the bank. These travel with the file when a bundle embeds it.',
  'bank.attribution': 'Where this bank came from, recorded with it.',
  'bank.import': 'Add the chosen file to this browser’s bank vault.',
  'bank.find': 'Filter the preset list.',
  'bank.preset': 'Presets in this bank that match the filter.',
  'bank.audition': 'Play this note on the selected preset, without assigning it.',
  'bank.assign': 'Which Instrument the selected preset is destined for.',
  'bank.usePreset':
    'Apply the selected preset to that Instrument, converting it to a SoundFont Instrument.',
  'bank.relink':
    'Reconnect this bank reference to a file you supply — for a bundle that arrived without its audio.',
  'bank.removeBytes':
    'Evict this bank’s audio from the vault, keeping the reference. It will not sound until relinked.',
} as const

export type HelpKey = keyof typeof help
