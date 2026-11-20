# Project foundation — User interface

How the UI is organised, the application shell, and the inspectors.
This is part of the [project foundation](../project-foundation.md), which holds
its version, authority, and undecided questions, and lists where each record is.

## Approved decisions

### FND-53 — UI organisation

- **Navigation:** top-level sections, and a run workspace with docked panels that opens for a run.
- **Main view:** a run opens on the city map with a shared event timeline under it.
- **Business and technical views:** separate views. The detail-level switch moves between them for
  the same run, moment, and selection, and each view also has its own detail levels.
- **Sections:**
  - **Runs and scenarios:** start runs, browse the scenario library, and see run history and batch
    results.
  - **Versions:** the version timeline, editor, summaries, and compatibility matrix.
  - **Comparisons:** comparison dashboards and run differences.
  - **City, profiles, and conformance:** edit cities and behaviour profiles, and handle the
    conformance exchange files.
  - **Criteria and coverage:** the criteria tracker, criteria and invariant editors, the coverage
    map, and coverage goals.
  - **Analysis:** parameter sweeps, sensitivity analysis, the value optimiser, and statistics
    across seeds.
  - **Assumptions and open questions:** the assumption register, undecided items, option switches,
    and documentation gaps.
  - **Faults and races:** fault presets, the race explorer, and the model checker with its proof
    reports.
  - **Findings:** the flaws found, their fix paths, and the items they feed into the real
    service's backlog.
  - **Stored data:** stored runs, import and export, and storage use.

The user decided these on 2026-11-03, in I01-E03-002, which resolves the former U6. The list of
sections is complete for now.

### FND-76 — Application shell and components

- **Navigation:** a left sidebar holds the top-level sections of
  [FND-53](#fnd-53--ui-organisation).
- **Sections:** all ten appear from the start, each on its own lazy-loaded route. A section not
  built yet has an empty page that says what will go there.
- **Theme:** light only. Colours come from CSS variables, so a theme can be added later.
- **Components:** hand-written components styled with those variables, using Angular's CDK for
  behaviour that is hard to get right, such as virtual scrolling, docking, and accessibility.
- **Run workspace, first form:** a main area with the event timeline under it and a detail panel on
  the right, in fixed places, and resizable by dragging. Real docking comes when there are enough
  panels to need it.
- **Starting a run:** picking a scenario opens the workspace paused at time 0, and the user starts
  it.
- **Speed:** preset buttons for `1x`, `10x`, `60x`, `600x`, and `max`, and a box for any other
  multiple.
- **Status bar:** the version, seed, simulated time, and the run's state, as
  [FND-34](capabilities-and-inventory.md#fnd-34--required-capabilities) and the first item require,
  and also the speed, the number of log entries, how many orders have finished, and whether the run
  passed once it has
  ended. Time is written as in scenario files: `h00:m05:s00:ms00`.
- **A run's end:** the clock stops at the time the scenario states, and the verdict shows. A button
  runs on past that, and the verdict stays as it was at the stated end. Another starts a fresh run.
- **Leaving a run:** moving to another section pauses a running run, and coming back resumes it.
- **Keyboard:** Space starts and pauses, S steps, and 1 to 5 choose the speed presets, unless the
  focus is in a text box. Space leaves a focused button to do its own job.

The user decided these on 2026-11-04, in I02-E05-001.

On 2026-11-07 the user added: "in general all ui component the perform an action sholuld contain
some kind of tooltip". Every control that does something, such as a button, a tab, a link, a
slider, or a divider that resizes, has a tooltip saying what it does. It is the app's own styled
tooltip, in the theme's colours, shown on hover and on keyboard focus after a short delay, and
above any panel that scrolls. The code style holds the rule, and review checks it.

On 2026-11-05 the user added these about how controls look:

- **Groups:** controls that belong together look joined, sharing their borders. These are the
  speed presets, the inspector's view toggles, and the speed box with its Set button.
- **Start button:** it stands out from the other buttons and shows the run's state, by icon as well
  as colour: ready, running, paused, ended, and failed.
- **States:** every control shows its state, such as hovered, pressed, focused, chosen, disabled,
  or wrong. A typed speed in use is marked in its box, as a chosen preset is, and choosing a preset
  clears the box and any error.
- **Follow button:** a small round button with a down arrow, floating at the bottom right of the
  event list.
- **Table columns:** in the event list and both views of the inspector, column widths can be
  resized by dragging, so a cut-off column can be widened. By module, a column resizes in all four
  tables at once, so they stay lined up. Widths last while the app stays open, and a reload resets
  them.
- **Smallest window:** the workspace keeps the width a 1280-pixel window leaves beside the
  sidebar. Below that it scrolls sideways, and the sidebar stays in place, so nothing is out of
  reach.
- **Table text:** 12 pixels in the event list and in both views of the inspector.
- **Status bar:** the run's state is a small pill coloured as the Start button is. Labels are grey
  and values dark.
- **Verdict:** a coloured banner says Passed or Failed, and each criterion has a green tick or a
  red cross, with any violations listed under it.
- **Sources:** each source in the event list is a small tinted badge in its own colour: orders
  teal, deliveries purple, actors grey. They no longer look like links.
- **Dividers:** a 1-pixel line that thickens and turns blue on hover or drag. The area that can be
  grabbed stays 6 pixels wide.
- **Read links:** blue, and underlined only on hover or keyboard focus.
- **Paused label:** the main button says Start when ready, Pause while running, and Resume when
  paused.
- **Runs page:** each built-in scenario is a card with its name and an Open button. A scenario file
  can be chosen or dropped on a dashed area.
- **Empty sections:** a section not built yet keeps its heading, and shows its description and a
  small "Not built yet" badge in a soft centred panel.
- **Workspace:** it fills the space up to the sidebar and status bar. The controls are a toolbar
  with a line beneath, and tables in every panel run edge to edge with the same padding inside.
- **Table spacing:** columns stay together at set widths from the left, and spare width goes to an
  empty area at the right. Numbers and times use digits of equal width, and `#` and Caused by align
  to the right.

### FND-77 — Event list and Payload viewer

- **The list:** every entry of the log, oldest first, with its number, simulated time, source
  module, kind, order, and what caused it. An entry that does not name its order shows the order of
  what caused it.
- **Following:** the list follows the newest entry while a run goes. Scrolling up or pressing an
  entry stops that, and a Follow button turns it back on. It stops on the press, not the click:
  in a moving list, a row that moves before the release would get no click.
- **Detail panel:** two tabs, Event and Verdict. Selecting an entry opens Event, and a run ending
  opens Verdict.
- **Payload viewer:** the entry's own facts, then its data as indented JSON, exactly as stored,
  with a Copy button. Caused by and Trace are links that select those entries.

The user decided these on 2026-11-04, in I02-E05-002.

### FND-78 — Outbox and inbox inspector

- **Place:** the first tab of the run workspace's main area. The city map becomes another tab
  beside it when it arrives.
- **Two views, with a toggle:** by flow, with a table for each direction, and each event's writing
  and reading on one row; and by module, with each module's outbox and inbox listed separately.
- **Each row:** the outbox event, its kind and order, when it was written and read, and how long it
  waited, or has waited so far. An event still waiting is highlighted, and each table's heading has
  its counts.
- **Clicking:** a row selects its outbox entry, and its read time is a link to the inbox read.
- **Retry records:** [FND-34](capabilities-and-inventory.md#fnd-34--required-capabilities) also asks
  for these. They arrive with retries, which the skeleton does not have yet.

The user decided these on 2026-11-04, in I02-E05-003.

### FND-79 — Cross-module event tracing

- **What it shows:** selecting an event shows every step of its trace, which is the whole action,
  and highlights the chain of causes and effects through the selected event. With nothing selected,
  a short hint says to select an event.
- **Form:** a sequence diagram with five lanes: the actor, the orders module, the orders outbox and
  inbox, the deliveries outbox and inbox, and the deliveries module.
- **Where:** a tab in the main area, beside the inspector. It follows the selected event, and the
  Payload viewer has a Show trace button that opens it.
- **Time:** one even row per step, with its time, and a mark such as `+25 s` where time passes
  between steps.
- **Rows:** each row has its time and label on the left, and a dot in its lane on the right, with
  the arrows joining the dots.
- **Step labels:** the entry's number and what happened in plain words: `#3 OrderDeliveryRequest`,
  `#6 Written: OrderDeliveryRequest`, `#8 Read: OrderDeliveryRequest`. The full ID shows on hover.
- **Clicking:** a step selects its entry, and the diagram stays on the same trace.
- **Arrows:** one per step, from its cause. Dashed from an outbox write to the inbox read that
  picks it up, and solid otherwise. The highlighted path is thicker and blue.
- **During a run:** new steps appear as they happen. An outbox write not yet read shows `waiting`
  in the inspector's amber, with a dashed arrow that stops short.

The user decided these on 2026-11-05, in I02-E05-004.
