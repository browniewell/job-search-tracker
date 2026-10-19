# Coding standards

Judgement calls for reviewing a change. Mechanical rules live in tooling instead: ESLint (including Dexie imports outside `src/data`, ADR-0002, copies of `errorMessage`, and JSX accessibility), Prettier, tsc, the schema tripwire in `src/data/schema.test.ts`, and the `e2e/layout-*.spec.ts` files, one per area, which check every page for overflow and run axe on it in both themes. A new page's checks go in its area's file, using the helpers in `e2e/layout.ts`. Vocabulary is defined in `GLOSSARY.md`; architecture in `docs/adr/`.

## Code

- **Extend, don't copy.** New code shaped like an existing helper generalises that helper and calls it from both places. Compare the diff with the code already in the repo, not only with itself: `checkStatusNameIsFree` copied `checkCompanyNameIsFree`, and `statusHasRolesMessage` copied the "1 Role, it / N Roles, them" wording of `companyHasRolesMessage`.

## Stored data

- **Schema changes.** A change to the fields a Role, Company or other stored entity is saved with ships with all of these:
  - a new Dexie version with an upgrade that brings existing records to the new shape;
  - a test that opens a database at the previous version and reads a record back;
  - a new entry in the tripwire's `storedFields` for the new version.

  An entry for a version that has reached main stays as it is: editing it in place, rather than adding a version, is a breach, because browsers already hold data in that shape.

- **Empty values are `null`**, with every field present on every record. Booleans default to `false` and lists, such as Flags, to `[]`. Empty strings never stand in for "not set".
- **Domain rules live in the data layer.** Validation and deletion rules (blank names, Fit rating range, a Company with Roles) are enforced in `src/data`. The UI may check first for a better flow, but it shows the data layer's own error message rather than writing its own.
- **Time comes from the injected clock.** Timestamps are ISO strings from `clock()`. Calendar dates the user picks are `YYYY-MM-DD` strings, and dates with a time, such as an Interview's, are local `YYYY-MM-DDTHH:mm` strings: shown as written, with no time zone.
- **Order is chosen, never inherited.** Ids are random and IndexedDB returns records in id order, so anything listed, or picked from several candidates, sorts on a field set on purpose: a timestamp with a tiebreak such as a Status history entry's `sequence`, or a name. In tests, ids sort opposite to the order records are made (`reverseOrderId` in `src/test/dataLayers.ts`) and the fixed clock makes timestamps tie, so a list that inherits its order comes out backwards and its test fails every time.

## Tests

- **Two seams only:** the data-layer interface, and the rendered `<App>` over the real data layer on fake-indexeddb. Playwright covers flows that need a real browser. Tests use our own modules for real, never mocked.
- **Given/When/Then names in glossary terms**, stating behaviour a user would recognise.
- **Red first.** A test that passed on its first run (a tripwire, an upgrade written before its test) is backed by a check: break the code, see the test fail, restore it. Note it in the PR's evidence.

## UI

- **Glossary terms in UI copy**, matching `GLOSSARY.md` exactly ("Role title", "Company not disclosed"). A new domain concept gets its glossary entry in the same PR; plain-English fields such as "industry" don't need one.
- **Copy used in more than one place is one constant.** Field labels are the exception: a field's edit form and its read-only view each write the label, and `GLOSSARY.md` keeps them in step.
- **Shared building blocks live in `src/components`** (field lists, form rows, delete confirmation). Pages live under their area, such as `src/roles` or `src/companies`. A second page needing a piece is the cue to move it to `src/components`.
- **Links from stored data render through `ExternalLink`**, which shows anything that isn't http(s) as text.
