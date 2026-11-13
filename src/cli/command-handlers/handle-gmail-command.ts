import { Console, Effect, Option } from "effect";
import CredentialsFileResolver from "../../config/credentials-file-resolver.js";
import CredentialsFileNotFoundError from "../../config/credentials-file-not-found-error.js";
import FilePath from "../../helpers/file-path.js";
import printBanner from "../print-banner.js";

/**
 * Prints the banner, resolves the OAuth2 credentials file, and prints a
 * placeholder message to standard error, since the `gmail` helper has no
 * further behavior yet
 *
 * @param credentialsFilePath - Path to the OAuth2 credentials JSON file, if
 * given; otherwise the well-known location is used
 * @param quiet - When true, suppresses the banner and status messages
 * @returns An effect that resolves once the placeholder message has been
 * printed, or fails with {@link CredentialsFileNotFoundError} when the
 * credentials file does not exist
 */
const handleGmailCommand: (
  credentialsFilePath: Option.Option<typeof FilePath.Type>,
  quiet: boolean,
) => Effect.Effect<
  void,
  CredentialsFileNotFoundError,
  CredentialsFileResolver
> = Effect.fn("gmail-command")(
  function* (credentialsFilePath, quiet) {
    const credentialsFileResolver = yield* CredentialsFileResolver;

    yield* printBanner(quiet);

    const credentialsFile =
      yield* credentialsFileResolver.resolve(credentialsFilePath);

    if (!quiet) {
      yield* Console.error(
        `Using OAuth2 credentials file [${credentialsFile.path}] (${credentialsFile.source}).`,
      );
    }
    yield* Console.error("The gmail helper is not implemented yet.");
  },
  Effect.catchTags({
    CredentialsFileNotFoundError: (e) =>
      Console.error(
        `❌ Could not find OAuth2 credentials file [${e.path}] (${e.source}). Make sure the file exists.`,
      ).pipe(Effect.andThen(() => Effect.fail(e))),
  }),
);

export default handleGmailCommand;
