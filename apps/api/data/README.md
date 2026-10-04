# rom-projects.json

Curated list of custom ROM projects used by the `rom-projects` sync job.

- `name` (required), and optional `github` (org URL), `website`, `telegram`, `discord`.
- GitHub organizations come from the public list https://github.com/wshamroukh/Android_Custom_Rom_List
  (a third-party discovery source). The importer verifies each one against the GitHub API.
- Entries without a `github` URL are still indexed by name; add links as you verify them.
- Add or fix an entry here, then run `npm run sync -w apps/api -- rom-projects`.
