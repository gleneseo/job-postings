# Glossary

## Language

**Helper**:
A single-purpose function of the `gleneseo-helpers` tool, exposed as a top-level subcommand. `job-postings` is the first Helper.
_Avoid_: Tool (that is the whole `gleneseo-helpers` CLI), script

**Job Postings sheet**:
The Google Sheet, kept in a Google Drive folder, that tracks the user's job postings and that the `job-postings` Helper downloads.
_Avoid_: Job list, spreadsheet

**Service account key file**:
The JSON credentials file that lets the `job-postings` Helper act as a Google Cloud service account when reading Google Drive and Sheets. It is either given explicitly or, by default, found in the Config directory as `job-postings.json`.
_Avoid_: Credentials, API key

**OAuth2 credentials file**:
The JSON file holding the OAuth2 credentials that let the `gmail` Helper act as the application when accessing the user's Gmail. It is not a Service account key file. It is either given explicitly or, by default, found in the Config directory as `gmail.json`.
_Avoid_: Access file, key file, service account key

**OAuth token**:
The cached result of the user consenting, in the browser, to let the `gmail` Helper read their mailbox, so later runs don't ask again. It is either given explicitly or, by default, kept in the Config directory as `gmail-token.json`.
_Avoid_: Credentials, access token file

**Email database**:
The SQLite file where the `gmail` Helper stores the emails it downloads, so later runs only fetch new messages. It is either given explicitly or, by default, kept in the Config directory as `gmail.sqlite`.
_Avoid_: Cache, inbox

**Config directory**:
The `gleneseo-helpers` directory, under the user's configuration home, where Helpers keep their configuration files. It is shared by all Helpers.
_Avoid_: Settings folder, config folder
