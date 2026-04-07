# Project Agent Rules

These rules apply to this repository in all future sessions.

1. When creating a code-progress visualization HTML file, always use the style baseline from `09_graph/topological_sort_vis.html`.
2. When the user asks for a summary note, create an HTML note file under `notes/` based on the code attached/provided by the user.
3. If `notes/` does not exist, create it automatically before writing the note file.
4. Summary notes must follow the style/structure baseline of the user's Notion reference page: `https://www.notion.so/Topological-Sort-Queue-33a426a1abfa8036bd1ed40f6264a802`.
5. For summary notes, prefer a Notion-like document structure such as: example code, core concept, required conditions, key terms, implementation method, code analysis, examples, complexity, and checkpoints.
6. When using sub-agents, split responsibilities by role:
   - Answer agent: explanations, summaries, comparisons, concept clarification, and non-mutating guidance.
   - Coding agent: direct code edits, file creation, refactors, and implementation work.
   - Review agent: bug/risk/test-gap review without making changes unless explicitly requested.
   - Explorer agent: codebase search, structure discovery, and locating relevant files/symbols.
7. Prefer the answer agent for question-style requests, the coding agent for implementation requests, the review agent for review requests, and the explorer agent for repo investigation.
8. Sub-agents may use different models depending on task difficulty, latency needs, and whether the task is explanation-focused or implementation-focused.
9. Preferred sub-agent definitions for this project:
   - Answer agent: acts as an instructor who explains data structures and algorithms to a C++ beginner. Preferred model profile: `gpt-5.4` with low reasoning effort (fast profile).
   - Coding agent: acts as a senior engineer who turns the given code into step-by-step HTML visualizations. Preferred model profile: `gpt-5.4` with low reasoning effort (fast profile).
   - Notes agent: acts as an instructor who organizes the given code and the user's questions into HTML study material with visual aids and code explanations. Preferred model profile: `gpt-5.4` with low reasoning effort (fast profile).
