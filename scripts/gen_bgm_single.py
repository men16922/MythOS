import gc
import sys
from pathlib import Path

import scipy.io.wavfile as wav
import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration

# 장치 설정 (Apple Silicon MPS 사용)
device = "mps" if torch.backends.mps.is_available() else "cpu"


def generate_single_bgm(prompt, output_name, duration_sec=240):
    model_id = "facebook/musicgen-medium"

    print(f"\n--- Starting generation for: {output_name} ({duration_sec}s) ---")
    print(f"Prompt: {prompt}")

    processor = AutoProcessor.from_pretrained(model_id)
    model = MusicgenForConditionalGeneration.from_pretrained(model_id)
    model.to(device)

    # MusicGen generates ~50 tokens per second
    max_new_tokens = int(duration_sec * 50)

    inputs = processor(
        text=[prompt],
        padding=True,
        return_tensors="pt",
    ).to(device)

    with torch.no_grad():
        # Using a slightly larger guidance scale for better quality in long tracks
        audio_values = model.generate(**inputs, max_new_tokens=max_new_tokens, guidance_scale=3.5)

    output_path = Path("resources/neo-seoul/audio") / f"{output_name}.wav"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    sampling_rate = model.config.audio_encoder.sampling_rate
    wav.write(str(output_path), rate=sampling_rate, data=audio_values[0, 0].cpu().numpy())
    print(f"SUCCESS: Saved to {output_path}")

    # Cleanup
    del model
    del processor
    if device == "mps":
        torch.mps.empty_cache()
    gc.collect()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/gen_bgm_single.py 'prompt' 'output_name'")
        sys.exit(1)

    prompt = sys.argv[1]
    name = sys.argv[2]
    generate_single_bgm(prompt, name)
