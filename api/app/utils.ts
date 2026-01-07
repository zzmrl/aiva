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
