This folder contains archived legacy code and one-off scripts kept for historical reference.

Purpose:

- Store removed or deprecated implementations (e.g., old pipeline, experimental distrib tools).
- Keep examples that may be useful for reference but are not part of the active codebase.

Guidelines:

- Files here should not be imported by active code. Before moving a file here, ensure no live imports reference it.
- CI is configured to skip builds when only files under archive/ change.
- To permanently delete a sensitive file, remove it from git history and rotate credentials.
