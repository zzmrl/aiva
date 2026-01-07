import { file } from "bun";

/**
 * Read an environment variable or a file containing the value.
 * If the environment variable is not set, it will attempt to
 * read the value from a file specified by the `${varName}_FILE`
 * environment variable.
 *
 * @example
 * // checks API_KEY for a value, else reads from API_KEY_FILE
 * const apiKey = await fileEnv("API_KEY");
 *
 * @param varName - The name of the environment variable.
 * @returns The value of the environment variable or the contents of the file.
 */
export async function fileEnv(varName: string): Promise<string> {
  const value = process.env[varName];
  const filePath = process.env[`${varName}_FILE`];
  if (value) {
    return value;
  } else if (filePath) {
    const text = await file(filePath).text();
    return text.trim();
  }
  throw new Error(`Missing: ${varName} or ${varName}_FILE`);
}
