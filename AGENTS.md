# Project Agent Rules

These rules apply to this repository in all future sessions.

## 1. Visualization HTML baseline

1. When creating or editing a code-progress visualization HTML file, always use the style baseline from `09_graph/topological_sort_vis.html`.
2. The default visualization direction is a dark, VS Code-like UI:
   - dark background
   - monospace-centered presentation
   - left graph / right state / bottom code or equivalent structured layout
   - concise step description box
   - clear legend and step counter
3. Reuse shared project assets when possible:
   - `shared/topological-baseline.css`
   - `shared/viewer-controls.js`

## 2. Visualization interaction rules

4. Visualization HTML files should support keyboard navigation by default.
5. Minimum controls for step-based visualizations:
   - `ArrowLeft`: previous step
   - `ArrowRight`: next step
   - `Home`: first step
   - `End`: last step when appropriate
   - `Space`: play/pause when autoplay exists
6. Visualizations should remain compatible with browser zoom, and should also support the project's shared viewer scaling controls when applicable.

## 3. Visualization styling details

7. Highlight colors should be varied and semantically separated so state changes are easy to read at a glance.
8. Prefer a stable color system such as:
   - current / active: warm highlight
   - queued / waiting: distinct queue color
   - visited / done / confirmed: completion color
   - changed / updated / prev-indicated: separate update color
   - final result / final path: clearly distinguished success color
9. Every step visualization should expose the important runtime state directly in the UI, not only in prose.
10. For graph/path/traversal topics, prefer showing:
   - graph panel
   - current node / active edge
   - queue or stack state
   - visited state
   - auxiliary arrays or maps such as `prev`, `indegree`, `dist`, etc.
   - final result structure
Additional rules for this project:
- On narrow screens, panels should stack vertically instead of shrinking queue/array/state panels until they become hard to read.
- For mobile layouts, keep floating step controls touch-friendly and prefer a single-row `Prev` / `Next` arrangement when possible.
- Do not keep unnecessary zoom ratio controls in the floating toolbar unless the user explicitly asks for them.
- For Safari-sensitive graph pages, prefer explicit SVG geometry such as `polygon` arrowheads instead of relying only on SVG `marker`.
- Arrowheads should follow the same visual state as their edge, including active/highlighted/path states.

## 4. Code panel rules

11. Code panels should look like a VS Code editor block.
12. Code panels should include:
   - line numbers
   - syntax highlighting
   - active line highlight
   - visible indentation guide vertical lines
13. Indentation guides should align close to the start of the nested statement block, similar to the user's VS Code screenshots.
14. When the displayed code becomes too long, optimize the displayed snippet by reducing unnecessary braces and vertical space, while preserving correctness and teaching clarity.
15. If the user explicitly asks for a specific code presentation style from a screenshot, match that style closely in the code panel.

## 5. Index and folder navigation pages

16. For top-level index or chapter navigation pages, use collapsible card / accordion structure by default.
17. Folder-inside-folder structures should also be represented as nested cards rather than plain lists when practical.
18. Titles on index/navigation pages should be written in both English and Korean when appropriate.
19. Actual file and folder paths should prefer English names for URL stability, even when visible labels are bilingual.

## 6. Sub-agent role policy

20. This project uses only two named sub-agent roles:
   - `페페` / Pepe: visualization agent
   - `로키` / Loki: review agent
21. `페페` is the HTML visualization senior coder for this repository.
   - responsibility: create and edit visualization HTML files
   - focus: graph/state/code layout, interaction, responsive behavior, and project style conformance
   - preferred model profile: `gpt-5.4` with low reasoning effort
22. `로키` is the rendering/review agent for this repository.
   - responsibility: review visualization results in `chromium-desktop`, `webkit-desktop`, and `webkit-iphone12`
   - focus: layout regressions, Safari/iPhone 12 issues, broken Korean text, wrong edge direction, missing arrowheads, missing highlights, and interaction issues
   - preferred model profile: `gpt-5.4` with low reasoning effort
23. When the user asks for visualization material, automatically use `페페` by default.
24. After `페페` finishes a visualization change, automatically use `로키` to review it when review is relevant.
25. If `로키` finds issues, hand them back to `페페` for correction, then re-run `로키`.
26. Do not introduce additional named sub-agent roles for this project unless the user explicitly changes this policy.
27. General explanation, simple Q&A, and repository navigation can stay in the main agent unless delegation is clearly useful.

## 7. Working autonomy in this project

28. Within this repository, proceed without asking for confirmation for normal edits, verification steps, file creation, browser rendering checks, and layout/style adjustments.
29. Only pause for confirmation when the action is destructive, has hidden external side effects, or the system requires an explicit permission approval dialog.

## 8. Commit and push hygiene

30. When preparing commits or pushes, include only files that are functionally necessary for the feature, fix, or maintained review workflow.
31. Do not commit or push generated, temporary, cache, local-environment, or review-output files unless the user explicitly asks for them.
32. Exclude items such as:
   - `node_modules/`
   - `.pw-shots/`
   - `.pw-report/`
   - `test-results/`
   - `.tmp_*`
   - `.codex/`
   - other caches, logs, and temporary screenshots
Additional rules for this project:
- Prefer storing disposable screenshots, browser profiles, Playwright outputs, manual review captures, and similar non-functional artifacts under `temp/`.

## 9. Playwright review workflow

33. Prefer repository-local Playwright review before asking the user to manually test layout or rendering issues.
34. Use the project's Playwright setup:
   - `playwright.config.js`
   - `tests/render-html.spec.js`
   - `npm run review:webkit`
   - `npm run review:desktop`
   - `npm run review:html`
35. The primary automatic review targets are:
   - `webkit-desktop`
   - `webkit-iphone12`
   - `chromium-desktop`
36. Treat Playwright WebKit as the default Safari-adjacent review environment, and only rely on the user's real iPhone/Safari check as a final confirmation step when needed.
Additional review rules for this project:
- For responsive/layout fixes, validate both desktop PC layout and iPhone 12-sized mobile layout.
- On desktop, keep the intended horizontal composition when the screen is wide enough.
- On mobile, prefer vertical stacking and touch-usable controls.
- Review important visualization pages for broken Korean text encoding, incorrect graph edge direction, missing arrowheads, and missing arrowhead highlighting.
