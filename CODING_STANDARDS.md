# Coding standards

Judgement calls for reviewing a change. Mechanical rules live in tooling instead: ESLint (including Dexie imports outside `src/data`, ADR-0002, imports from another area, copies of `errorMessage`, specs that add Roles, Companies or Contacts outside `e2e/seed.ts`, and JSX accessibility), Prettier, tsc (including `exactOptionalPropertyTypes`, so a partial edit can't overwrite a field with `undefined`), the schema tripwire in `src/data/schema.test.ts`, and the `e2e/layout-*.spec.ts` files, one per area, which check every page for overflow and run axe on it in both themes. A new page's checks go in its area's file, using the helpers in `e2e/layout.ts`. Vocabulary is defined in `GLOSSARY.md`; architecture in `docs/adr/`.

## Code

- **Extend, don't copy.** New code shaped like existing code, whether a helper or another test's steps, generalises it into one helper called from both places. Compare the diff with the code already in the repo, not only with itself: `checkStatusNameIsFree` copied `checkCompanyNameIsFree`, `statusHasRolesMessage` copied the "1 Role, it / N Roles, them" wording of `companyHasRolesMessage`, and a board spec copied another's keyboard move before it became `moveByKeyboard`.

## Stored data

- **Schema changes.** A change to the fields a Role, Company or other stored entity is saved with ships with all of these:
  - a new Dexie version with an upgrade that brings existing records to the new shape;
  - a test that opens a database at the previous version and reads a record back;
  - a new entry in the tripwire's `storedFields` for the new version.

  An entry for a version that has reached main stays as it is: editing it in place, rather than adding a version, is a breach, because browsers already hold data in that shape.

- **Empty values are `null`**, with every field present on every record. Booleans default to `false` and lists, such as Flags, to `[]`. Empty strings never stand in for "not set".
- **Domain rules live in the data layer.** Validation and deletion rules (blank names, Fit rating range, a Company with Roles) are enforced in `src/data`. The UI may check first for a better flow, but it shows the data layer's own error message rather than writing its own.
- **Time comes from the injected clock.** Timestamps are ISO strings from `clock()`. Calendar dates the user picks are `YYYY-MM-DD` strings, and dates with a time, such as an Interview's, are local `YYYY-MM-DDTHH:mm` strings: shown as written, with no time zone.
- **Order is chosen, never inherited.** Ids are random and IndexedDB returns records in id order, so anything listed, or picked from several candidates, sorts on a field set on purpose: a timestamp with a tiebreak such as a Status history entry's `sequence`, or a name. In tests, ids sort opposite to the order records are made (`reverseOrderId` in `src/test/dataLayers.ts`) and the fixed clock makes timestamps tie, so a list that inherits its order comes out backwards. That fails its test only when the test makes the records in the order the list should show them; made in reverse, inherited order passes. An order test makes its records in the expected order and ties each sort key in turn, so every tiebreak is exercised.

## Tests

- **Two seams only:** the data-layer interface, and the rendered `<App>` over the real data layer on fake-indexeddb. Playwright covers flows that need a real browser. Tests use our own modules for real, never mocked.
- **Given/When/Then names in glossary terms**, stating behaviour a user would recognise. A test of state that is simply there, such as seeded Statuses or a list's order, is named Given/Then: the When is the action under test, and such a test has none.
- **Wait for the change itself.** After an action, a test waits for something the action makes appear, or `waitFor`s something to go. A `findBy` for an element already on screen returns at once, before the action has landed, so the next assertion races the reload; `npm run test:repeat` in CI catches some of these, the rest only under load.
- **Red first.** A test that passed on its first run (a tripwire, an upgrade written before its test) is backed by a check: break the code, see the test fail, restore it. Note it in the PR's evidence.

## UI

- **Glossary terms in UI copy**, matching `GLOSSARY.md` exactly ("Role title", "Company not disclosed"). A new domain concept gets its glossary entry in the same PR; plain-English fields such as "industry" don't need one.
- **Copy used in more than one place is one constant.** Field labels are the exception: a field's edit form, its read-only view and its CSV export header each write the label, and `GLOSSARY.md` keeps them in step. A CSV header uses its edit form's wording ("Posted salary minimum").
- **Shared building blocks live in `src/components`** (field lists, form rows, delete confirmation). Pages live under their area, such as `src/roles` or `src/companies`. A second page needing a piece is the cue to move it to `src/components`, or to `src/format.ts` for display formatting, in the same PR.
- **Links from stored data render through `ExternalLink`**, which shows anything that isn't http(s) as text.
