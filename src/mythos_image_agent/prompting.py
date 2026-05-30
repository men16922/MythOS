from __future__ import annotations

from openai import OpenAI

from .config import AgentConfig

SYSTEM_PROMPT = (
    "You are an expert prompt engineer for the FLUX.1 image generation model. "
    "Transform the user's idea into a highly detailed visual prompt in English. "
    "Emphasize concrete visual details, lighting, camera perspective, material, "
    "composition, and cinematic style. If text should appear in the image, specify "
    "the exact text inside double quotes. Respond with only the final prompt as "
    "one clean paragraph under 70 English words. Do not use markdown, section labels, "
    "bullets, or commentary."
)


def expand_prompt(user_idea: str, config: AgentConfig, model_override: str | None = None) -> str:
    client = OpenAI(base_url=config.ollama_base_url, api_key="ollama")

    response = client.chat.completions.create(
        model=model_override or config.ollama_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_idea},
        ],
        temperature=0.7,
    )

    content = response.choices[0].message.content
    return content.strip() if content else ""
