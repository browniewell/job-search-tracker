# Dexie over IndexedDB, behind a single data-layer module

All data lives in the browser's IndexedDB, accessed through Dexie for versioned schema migrations and transactions (a Status change and its Status history entry must commit together). Nothing outside one data-layer module touches Dexie, so storage can be swapped and the data layer can be unit tested in Node against fake-indexeddb.
