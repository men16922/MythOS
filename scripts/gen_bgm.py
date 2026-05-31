import torch
from transformers import MusicgenForConditionalGeneration, AutoProcessor
import scipy.io.wavfile as wav
import os
import gc
from pathlib import Path

# 장치 설정 (Apple Silicon MPS 사용)
device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Using device: {device}")

def generate_bgm_task(prompt, output_name, duration_sec=240):
    model_id = "facebook/musicgen-medium"
    
    print(f"\n--- Starting generation for: {output_name} ({duration_sec}s) ---")
    print(f"Prompt: {prompt}")
    
    # Load processor and model inside the function to allow cleanup
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
        audio_values = model.generate(**inputs, max_new_tokens=max_new_tokens)

    # Save path
    output_path = Path("resources/neo-seoul/audio") / f"{output_name}.wav"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    sampling_rate = model.config.audio_encoder.sampling_rate
    wav.write(str(output_path), rate=sampling_rate, data=audio_values[0, 0].cpu().numpy())
    print(f"SUCCESS: Saved to {output_path}")

    # Explicitly cleanup memory
    del model
    del processor
    if device == "mps":
        torch.mps.empty_cache()
    gc.collect()

if __name__ == "__main__":
    tasks = [
        ("Grand cinematic cyberpunk theme, majestic synthesizer, digital awakening, mysterious and welcoming, high-end production, 90bpm", "bgm_main"),
        ("Cyberpunk dark ambient, futuristic city rain, lo-fi synth drone, melancholic, 80bpm", "bgm_calm"),
        ("Fast cyberpunk techno, industrial percussion, high tension, cinematic synthesizer, 140bpm", "bgm_tense"),
        ("Glitchy electronic, distorted digital signal, eerie dark drones, irregular rhythm, Y2K aesthetic", "bgm_unstable")
    ]
    
    for prompt, name in tasks:
        try:
            generate_bgm_task(prompt, name)
        except Exception as e:
            print(f"FAILED {name}: {e}")
