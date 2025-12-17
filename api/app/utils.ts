import { file } from "bun";

/**
 * Read text from a file
 * @param filePath - Path to the file
 * @returns text from the file
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    const text = await file(filePath).text();
    return text.trim();
  } catch (_error) {
    throw new Error(`Failed to read file: ${filePath}`);
  }
}

/**
 * Get a value either from the environment or a file.
 *
 * If the environment variable is not set, look for file path environment variable
 * by appending "_FILE" to the variable name and reading the value from the file.
 *
 * @param envVarName - Name of the environment variable
 * @returns value of the environment variable
 */
export async function loadEnv(envVarName: string): Promise<string> {
  const value = process.env[envVarName];
  if (value) {
    return value;
  }
  const filePath = process.env[`${envVarName}_FILE`];
  if (filePath) {
    return readFile(filePath);
  }
  throw new Error(`Missing required environment variable: ${envVarName}`);
}

/**
 * Get an environment variable or throw an error if it is not set
 * @param envVarName - Name of the environment variable
 * @returns value of the environment variable
 */
export function getEnvOrThrow(envVarName: string): string {
  const value = process.env[envVarName];
  if (!value) {
    throw new Error(`Missing required environment variable: ${envVarName}`);
  }
  return value;
}
