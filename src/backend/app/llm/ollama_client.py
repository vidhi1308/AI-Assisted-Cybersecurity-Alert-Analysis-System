import requests

def ollama_generate_json(
    *,
    model: str,
    prompt: str,
    temperature: float = 0.2,
    num_ctx: int = 4096,
    base_url: str = "http://localhost:11434",
) -> str:
    """
    Calls Ollama's /api/generate and returns the 'response' text (not streamed).
    """
    url = f"{base_url}/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_ctx": num_ctx,
        },
    }
    r = requests.post(url, json=payload, timeout=600)
    r.raise_for_status()
    data = r.json()
    return data.get("response", "")
