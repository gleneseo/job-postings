# Glossary

## Language

**Helper**:
A single-purpose function of the `gleneseo-helpers` tool, exposed as a top-level subcommand, e.g. `job-postings` or `gmail`.
_Avoid_: Tool (that is the whole `gleneseo-helpers` CLI), script

**Job Postings sheet**:
The Google Sheet, kept in a Google Drive folder, that tracks the user's job postings and that the `job-postings` Helper downloads.
_Avoid_: Job list, spreadsheet

**Tab**:
One of the pages inside the Job Postings sheet. The `job-postings` Helper reads a single Tab, chosen by its position, the first one by default.
_Avoid_: Sheet (that is the whole Job Postings sheet), worksheet

**Service account key file**:
The JSON credentials file that lets the `job-postings` Helper act as a Google Cloud service account when reading Google Drive and Sheets. It is either given explicitly or, by default, found in the Config directory as `job-postings.json`.
_Avoid_: Credentials, API key

**OAuth2 credentials file**:
The JSON file holding the OAuth2 credentials that let the `gmail` Helper act as the application when accessing the user's Gmail. It is not a Service account key file. It is either given explicitly or, by default, found in the Config directory as `gmail.json`.
_Avoid_: Access file, key file, service account key

**OAuth token**:
The cached result of the user consenting, in the browser, to let the `gmail` Helper read their mailbox, so later runs don't ask again. It is either given explicitly or, by default, kept in the Data directory as `gmail-token.json`.
_Avoid_: Credentials, access token file

**Email database**:
The SQLite file where the `gmail` Helper stores the emails it downloads, so later runs only fetch new messages. It is either given explicitly or, by default, kept in the Data directory as `gmail.sqlite`.
_Avoid_: Cache, inbox

**Well-known location**:
The place a Helper looks for one of its files when the user doesn't give a path. It is the file's name inside the Config directory or the Data directory, depending on whether the file is configuration or generated data. The home of each directory comes from an environment variable when that is set to an absolute path, and otherwise falls back to a default under the user's home directory.
_Avoid_: Default path, default location

**Well-known file**:
A file that a Helper finds in a Well-known location when none is given explicitly, such as the Service account key file, the OAuth2 credentials file, the OAuth token, and the Email database.
_Avoid_: Default file

**Config directory**:
The `gleneseo-helpers` directory, under the user's configuration home, where Helpers keep their configuration files. It is shared by all Helpers.
_Avoid_: Settings folder, config folder

**Data directory**:
The `gleneseo-helpers` directory, under the user's data home, where Helpers keep the data they generate, such as the OAuth token and the Email database. It is shared by all Helpers and is separate from the Config directory.
_Avoid_: Storage folder, data folder, cache
