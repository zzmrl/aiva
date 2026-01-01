import client from "./client";

const MODEL = "venice-uncensored";

export async function completion(prompt: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0]?.message.content || "";
}

type CompletionMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function textCompletion(
  messages: CompletionMessage[],
): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "You are a helpful assistant" },
      {
        role: "system",
        content:
          "You are a responding through SMS, so keep your responses short and concise.",
      },
      ...messages,
    ],
    // @ts-expect-error OpenAI client does not support venice_parameters
    venice_parameters: {
      enable_web_search: "auto",
    },
  });

  return response.choices[0]?.message.content || "";
}
