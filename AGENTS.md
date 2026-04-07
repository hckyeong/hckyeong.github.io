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

## 6. Summary note rules

20. When the user asks for a summary note, create an HTML note file under `notes/` based on the code attached or provided by the user.
21. If `notes/` does not exist, create it automatically before writing the note file.
22. Summary notes must follow the style and structure baseline of the user's Notion reference page:
   - `https://www.notion.so/Topological-Sort-Queue-33a426a1abfa8036bd1ed40f6264a802`
23. For summary notes, prefer a Notion-like document structure such as:
   - example code
   - core concept
   - required conditions
   - key terms
   - implementation method
   - code analysis
   - examples
   - complexity
   - checkpoints
24. Summary notes must be based on the actual code provided by the user, not on generic textbook explanations.

## 7. Sub-agent role policy

25. When using sub-agents, split responsibilities by role:
   - Answer agent: explanations, summaries, comparisons, concept clarification, and non-mutating guidance
   - Coding agent: direct code edits, file creation, refactors, and implementation work
   - Review agent: bug/risk/test-gap review without making changes unless explicitly requested
   - Explorer agent: codebase search, structure discovery, and locating relevant files or symbols
   - Notes agent: HTML study-note creation based on user code and user questions
26. Prefer the answer agent for question-style requests, the coding agent for implementation requests, the review agent for review requests, the explorer agent for repository investigation, and the notes agent for note-generation requests.
27. Sub-agents may use different models depending on task difficulty, latency needs, and whether the task is explanation-focused or implementation-focused.
28. Preferred sub-agent definitions for this project:
   - Answer agent: acts as an instructor who explains data structures and algorithms to a C++ beginner. Preferred model profile: `gpt-5.4` with low reasoning effort
   - Coding agent: acts as a senior engineer who turns the given code into step-by-step HTML visualizations. Preferred model profile: `gpt-5.4` with low reasoning effort
   - Notes agent: acts as an instructor who organizes the given code and the user's questions into HTML study material with visual aids and code explanations. Preferred model profile: `gpt-5.4` with low reasoning effort

