# Figure-sequence pitch mappings

Spirophonic Composition files are JSON. Put either object below in a note
Part's `pitch` field. The Encounter query supplies timing; this mapping supplies
the ordered melodic or harmonic material.

## FIFO phrase with a chord

```json
{
  "kind": "figure-sequence",
  "accessMode": "fifo",
  "endBehavior": "loop",
  "resetOn": "bar",
  "root": 60,
  "scale": "major",
  "transform": {
    "kind": "prime",
    "transpose": 0,
    "axis": 60,
    "intervalScale": 1
  },
  "figures": [
    { "kind": "note", "note": 60 },
    { "kind": "note", "note": 64 },
    { "kind": "chord", "notes": [67, 71, 74] },
    { "kind": "scale-degree", "degree": 5 }
  ]
}
```

Each bar starts the phrase again. The third selected Encounter emits three
simultaneous canonical notes from one source Encounter.

## LIFO retrograde inversion

```json
{
  "kind": "figure-sequence",
  "accessMode": "lifo",
  "endBehavior": "loop",
  "resetOn": "performance",
  "root": 62,
  "scale": "dorian",
  "transform": {
    "kind": "retrograde-inversion",
    "transpose": 0,
    "axis": 62,
    "intervalScale": 1
  },
  "figures": [
    { "kind": "note", "note": 60 },
    { "kind": "note", "note": 64 },
    { "kind": "pitch-class-set", "pitchClasses": [2, 5, 9] },
    { "kind": "interval-structure", "intervals": [0, 3, 7] }
  ]
}
```

Retrograde reverses the transformed collection; LIFO traverses that collection
from its end. Combining the two intentionally restores the original access
order while retaining inversion. Change either one independently to hear its
effect.

MIDI note numbers are the saved representation. The editor names notes beside
single-note, root, and axis controls. Scale degrees resolve from `root` and
`scale`; pitch classes are placed at or above the root's register; interval
structures add their semitone offsets to `root`.
