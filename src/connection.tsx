// connection.tsx
// Handles communication with Ollama API (gemma3:1b model)

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'gemma3:1b';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaErrorResponse {
  error: string;
}

/**
 * Calls the Ollama model with a prompt and returns the response
 * @param prompt - The input prompt to send to the model
 * @returns The model's response text
 * @throws Error if the API call fails
 */
export async function callOllamaModel(prompt: string): Promise<string> {
  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData: OllamaErrorResponse = await response.json();
      throw new Error(`Ollama API error: ${errorData.error || response.statusText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to call Ollama model: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Calls the Ollama model with streaming responses
 * @param prompt - The input prompt to send to the model
 * @param onChunk - Callback function called with each streamed chunk
 * @throws Error if the API call fails
 */
export async function callOllamaModelStream(
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: prompt,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Process complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line) {
          try {
            const data: OllamaResponse = JSON.parse(line);
            onChunk(data.response);
          } catch (e) {
              console.error(e)
            console.error('Failed to parse response chunk:', line);
          }
        }
      }

      // Keep the last incomplete line in the buffer
      buffer = lines[lines.length - 1];
    }

    // Process any remaining content
    if (buffer.trim()) {
      try {
        const data: OllamaResponse = JSON.parse(buffer);
        onChunk(data.response);
      } catch (e) {
          console.error(e)
        console.error('Failed to parse final response chunk:', buffer);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to call Ollama model with streaming: ${error.message}`);
    }
    throw error;
  }
}

export default { callOllamaModel, callOllamaModelStream };