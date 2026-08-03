## Current work

Active design contract: [docs/SOUND-AND-MIDI-DESIGN.md](docs/SOUND-AND-MIDI-DESIGN.md).
Read it before touching `src/core/`, `src/export/`, or the audio engine. It
carries a packet table with dependencies, per-packet file lists, and acceptance
criteria, and it is written for hand-off between sessions and agents. Update the
packet status table in the same commit that lands the work.

Gate every change on `npm test`, `npm run lint`, and `npm run build`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
