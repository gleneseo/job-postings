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

**Config directory**:
The `gleneseo-helpers` directory, under the user's configuration home, where Helpers keep their configuration files. It is shared by all Helpers.
_Avoid_: Settings folder, config folder
