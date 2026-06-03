import gc
from pathlib import Path

import numpy as np
import scipy.io.wavfile as wav

# Config
SR = 22050  # Sampling rate
OUT_DIR = Path("resources/neo-seoul/audio")
SFX_DIR = OUT_DIR / "sfx"

OUT_DIR.mkdir(parents=True, exist_ok=True)
SFX_DIR.mkdir(parents=True, exist_ok=True)


# Helper: Lo-Fi/Bitcrush effect to apply over sound waves with Peak Limiter
def apply_lofi_effect(data, bit_depth=5, hiss_level=0.03, lowpass_window=2):
    # 1. Soft-clipping Peak Limiter / Maximizer
    # Standardizes levels based on RMS to prevent short spikes from muting the average volume
    rms = np.sqrt(np.mean(data**2))
    if rms > 0:
        data = data / (rms * 2.5)  # Scale up average signal
        data = np.tanh(data)  # Soft clipping compression (adds warm harmonic saturation)

    # 2. Bitcrushing (quantize amplitudes to represent vintage/retro sampling resolution)
    max_val = np.max(np.abs(data))
    if max_val > 0:
        normalized = data / max_val
        levels = 2 ** (bit_depth - 1)
        crushed = np.round(normalized * levels) / levels
        data = crushed * max_val

    # 3. Analog tape hiss (inject vintage low-level white noise)
    hiss = np.random.normal(0, hiss_level * (max_val if max_val > 0 else 1.0), len(data))
    data = data + hiss

    # 4. Low-pass filter simulation (moving average to cut crisp high-ends and warm up tone)
    if lowpass_window > 1:
        data = np.convolve(data, np.ones(lowpass_window) / lowpass_window, mode="same")

    # Final full-scale normalization
    new_max = np.max(np.abs(data))
    if new_max > 0:
        data = data / new_max

    return data


def save_wav(filename, data, rate=SR):
    # Normalize to 16-bit PCM
    data = data / np.max(np.abs(data)) if np.max(np.abs(data)) > 0 else data
    data_int = (data * 32767).astype(np.int16)
    wav.write(str(filename), rate, data_int)
    print(f"Synthesized and saved: {filename}")


# --- FALLBACK DSP SYNTHESIZERS (Lo-Fi Cyber SFX) ---


def synth_attack_fallback():
    duration = 0.3
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    freq = 500 * np.exp(-30 * t) + 35
    phase = 2 * np.pi * np.cumsum(freq) / SR

    saw = (phase % (2 * np.pi)) / np.pi - 1.0
    square = np.sign(np.sin(phase))
    synth = 0.6 * saw + 0.4 * square

    noise = np.random.uniform(-1.0, 1.0, len(t))
    env_noise = np.exp(-35 * t)
    env_synth = np.exp(-12 * t)

    data = (synth * env_synth) + (0.5 * noise * env_noise)
    data = apply_lofi_effect(data, bit_depth=4, hiss_level=0.05)
    save_wav(SFX_DIR / "sfx_attack.wav", data)


def synth_defend_fallback():
    duration = 0.4
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    freq = 60 + (110 * t / duration)
    mod = np.sin(2 * np.pi * 40 * t) * 35
    phase = 2 * np.pi * np.cumsum(freq + mod) / SR

    sine = np.sin(phase)
    buzz = np.sign(np.sin(2 * np.pi * 50 * t)) * 0.25

    env = np.exp(-6 * t) * np.sin(np.pi * t / duration)
    data = (sine + buzz) * env
    data = apply_lofi_effect(data, bit_depth=4, hiss_level=0.06)
    save_wav(SFX_DIR / "sfx_defend.wav", data)


def synth_move_fallback():
    duration = 0.22
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    freq = 150 * np.exp(-18 * t) + 50 + 25 * np.sin(np.pi * t / duration)
    phase = 2 * np.pi * np.cumsum(freq) / SR

    saw = (phase % (2 * np.pi)) / np.pi - 1.0
    rumble = np.random.uniform(-0.8, 0.8, len(t))
    env_rumble = np.exp(-15 * t)
    env_saw = np.sin(np.pi * t / duration)

    data = (saw * env_saw * 0.65) + (rumble * env_rumble * 0.35)
    data = apply_lofi_effect(data, bit_depth=3, hiss_level=0.04)
    save_wav(SFX_DIR / "sfx_move.wav", data)


def synth_glitch_fallback():
    duration = 0.5
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    data = np.zeros_like(t)

    chunk_size = int(SR * 0.04)
    for i in range(0, len(t), chunk_size):
        freq = np.random.uniform(40, 350)
        chunk_t = t[i : i + chunk_size]
        if len(chunk_t) == 0:
            break

        phase = 2 * np.pi * freq * chunk_t
        square = np.sign(np.sin(phase))
        noise = np.random.uniform(-0.8, 0.8, len(chunk_t))
        downsample_rate = np.random.choice([3, 6, 9])
        for j in range(0, len(noise), downsample_rate):
            noise[j : j + downsample_rate] = noise[j]

        data[i : i + chunk_size] = (0.35 * square) + (0.65 * noise)

    gate = np.random.choice([0, 1], len(t), p=[0.2, 0.8])
    data = data * gate

    env = np.exp(-5 * t)
    data = data * env
    data = apply_lofi_effect(data, bit_depth=3, hiss_level=0.08)
    save_wav(SFX_DIR / "sfx_glitch.wav", data)


def synth_victory_fallback():
    duration = 1.2
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    data = np.zeros_like(t)

    notes = [261.63, 329.63, 392.00, 523.25]  # C4, E4, G4, C5 (One octave down)
    note_duration = duration / len(notes)
    note_len = int(SR * note_duration)

    for i, freq in enumerate(notes):
        start = i * note_len
        end = start + note_len
        t_note = np.linspace(0, note_duration, note_len, endpoint=False)

        saw1 = (t_note * freq) % 1.0 * 2.0 - 1.0
        saw2 = (t_note * (freq * 1.015)) % 1.0 * 2.0 - 1.0
        saw3 = (t_note * (freq * 0.985)) % 1.0 * 2.0 - 1.0

        synth = (saw1 + 0.65 * saw2 + 0.65 * saw3) / 2.3
        env = np.exp(-3.0 * t_note)
        data[start:end] = synth * env

    data = apply_lofi_effect(data, bit_depth=5, hiss_level=0.04)
    save_wav(SFX_DIR / "sfx_victory.wav", data)


def synth_defeat_fallback():
    duration = 1.6
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    data = np.zeros_like(t)

    notes = [261.63, 207.65, 174.61, 138.59]  # C4 -> Ab3 -> F3 -> Db3
    note_duration = duration / len(notes)
    note_len = int(SR * note_duration)

    for i, freq in enumerate(notes):
        start = i * note_len
        end = start + note_len
        t_note = np.linspace(0, note_duration, note_len, endpoint=False)

        freq_slide = freq * np.exp(-4 * t_note)
        phase = 2 * np.pi * np.cumsum(freq_slide) / SR

        saw = (phase % (2 * np.pi)) / np.pi - 1.0
        square = np.sign(np.sin(phase))
        synth = 0.5 * saw + 0.5 * square

        env = np.exp(-2.2 * t_note)
        data[start:end] = synth * env

    sub_t = t[int(SR * 0.8) :]
    if len(sub_t) > 0:
        sub_t_rel = sub_t - sub_t[0]
        sub_freq = 90 * np.exp(-9 * sub_t_rel)
        sub_phase = 2 * np.pi * np.cumsum(sub_freq) / SR
        sub_sine = np.sin(sub_phase) * np.exp(-3.0 * sub_t_rel)
        data[int(SR * 0.8) :] += sub_sine * 0.8

    data = apply_lofi_effect(data, bit_depth=4, hiss_level=0.07)
    save_wav(SFX_DIR / "sfx_defeat.wav", data)


# --- BATTLE BGM SYNTHESIZERS (Fallback 8-bit Cyber Loops) ---


def generate_techno_kick(t, bpm=120):
    beat_dur = 60.0 / bpm
    beat_t = t % beat_dur
    freq = 150 * np.exp(-60 * beat_t) + 40
    kick = np.sin(2 * np.pi * np.cumsum(freq) / SR)
    env = np.exp(-15 * beat_t)
    return kick * env


def synth_bgm_normal():
    duration = 12.0
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    bpm = 120
    kick = generate_techno_kick(t, bpm)

    bass = np.zeros_like(t)
    beat_dur = 60.0 / bpm
    notes = [65.4, 98.0, 103.8, 87.3]  # C2, G2, Ab2, F2
    for i in range(int(duration / beat_dur)):
        note_freq = notes[(i // 2) % len(notes)]
        start = int(i * beat_dur * SR)
        end = int((i + 1) * beat_dur * SR)
        t_segment = t[start:end]
        if len(t_segment) == 0:
            break

        saw = (t_segment * note_freq) % 1.0 * 2.0 - 1.0
        env = np.exp(-3 * (t_segment - i * beat_dur))
        bass[start:end] = saw * env * 0.4

    lead = np.zeros_like(t)
    step_dur = beat_dur / 4
    melody = [261.6, 311.1, 392.0, 466.2, 392.0, 311.1]
    for i in range(int(duration / step_dur)):
        note_freq = melody[i % len(melody)]
        start = int(i * step_dur * SR)
        end = int((i + 1) * step_dur * SR)
        t_segment = t[start:end]
        if len(t_segment) == 0:
            break

        pulse = np.sign(np.sin(2 * np.pi * note_freq * t_segment))
        env = np.exp(-10 * (t_segment - i * step_dur))
        lead[start:end] = pulse * env * 0.2

    data = kick * 0.5 + bass * 0.3 + lead * 0.2
    data = apply_lofi_effect(data, bit_depth=5, hiss_level=0.03)
    save_wav(OUT_DIR / "bgm_combat_normal.wav", data)


def synth_bgm_boss():
    duration = 10.0
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    bpm = 140
    kick = generate_techno_kick(t, bpm)

    drone = np.zeros_like(t)
    beat_dur = 60.0 / bpm
    notes = [92.50, 98.00, 92.50, 87.31]  # F#2, G2, F#2, F2
    for i in range(int(duration / beat_dur)):
        note_freq = notes[(i // 2) % len(notes)]
        start = int(i * beat_dur * SR)
        end = int((i + 1) * beat_dur * SR)
        t_segment = t[start:end]
        if len(t_segment) == 0:
            break

        saw = (t_segment * note_freq) % 1.0 * 2.0 - 1.0
        env = np.sin(np.pi * (t_segment - i * beat_dur) / beat_dur)
        drone[start:end] = saw * env * 0.4

    lead = np.zeros_like(t)
    step_dur = beat_dur / 2
    melody = [587.33, 622.25, 587.33, 659.25, 587.33, 554.37]
    for i in range(int(duration / step_dur)):
        note_freq = melody[i % len(melody)]
        start = int(i * step_dur * SR)
        end = int((i + 1) * step_dur * SR)
        t_segment = t[start:end]
        if len(t_segment) == 0:
            break

        saw = (t_segment * note_freq) % 1.0 * 2.0 - 1.0
        env = np.exp(-15 * (t_segment - i * step_dur))
        lead[start:end] = saw * env * 0.25

    data = kick * 0.5 + drone * 0.3 + lead * 0.2
    data = apply_lofi_effect(data, bit_depth=4, hiss_level=0.04)
    save_wav(OUT_DIR / "bgm_combat_boss.wav", data)


def synth_bgm_crisis():
    duration = 8.0
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    bpm = 150

    beat_dur = 60.0 / bpm
    kick = np.zeros_like(t)
    for i in range(int(duration / beat_dur)):
        start = int(i * beat_dur * SR)
        end = int((i + 1) * beat_dur * SR)
        t_segment = t[start:end]
        if len(t_segment) == 0:
            break

        t_rel = t_segment - i * beat_dur
        k1 = np.sin(2 * np.pi * 100 * np.exp(-50 * t_rel)) * np.exp(-18 * t_rel)
        t_rel2 = np.maximum(0, t_rel - 0.15)
        k2 = np.sin(2 * np.pi * 100 * np.exp(-50 * t_rel2)) * np.exp(-18 * t_rel2)
        kick[start:end] = (k1 + k2) * 0.5

    siren = np.zeros_like(t)
    sweep_period = beat_dur * 2
    mod_freq = np.sin(2 * np.pi * (t / sweep_period)) * 120 + 350
    phase = 2 * np.pi * np.cumsum(mod_freq) / SR
    siren = np.sin(phase) * 0.25

    gate = (np.sign(np.sin(2 * np.pi * 12 * t)) + 1.0) / 2.0
    siren = siren * gate

    data = kick * 0.6 + siren * 0.4
    data = apply_lofi_effect(data, bit_depth=3, hiss_level=0.05)
    save_wav(OUT_DIR / "bgm_combat_crisis.wav", data)


# --- AI GENERATION WITH FALLBACK ---


def generate_sfx_with_ai():
    import torch

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Loading AI Model 'facebook/musicgen-small' for SFX on device: {device}")

    from transformers import AutoProcessor, MusicgenForConditionalGeneration

    model_id = "facebook/musicgen-small"
    processor = AutoProcessor.from_pretrained(model_id)
    model = MusicgenForConditionalGeneration.from_pretrained(model_id)
    model.to(device)

    # We write lo-fi cyberpunk prompts for MusicGen to create 1-2s SFX beats/noises
    sfx_tasks = {
        "sfx_attack.wav": {
            "prompt": "heavy lo-fi futuristic laser blast, distorted noise, 8-bit game strike, low sub punch",
            "duration": 1.2,
        },
        "sfx_defend.wav": {
            "prompt": "lo-fi industrial forcefield hum, metallic energy shield buzzing, analog static barrier",
            "duration": 1.5,
        },
        "sfx_move.wav": {
            "prompt": "heavy mechanical robotic servo motor click, short hydraulic piston release, lo-fi noise",
            "duration": 0.8,
        },
        "sfx_glitch.wav": {
            "prompt": "extreme lo-fi bitcrushed digital signal error, crackling circuit static burst, Y2K glitch",
            "duration": 1.5,
        },
        "sfx_victory.wav": {
            "prompt": "triumphant retro cyberpunk synth melody chime, 8-bit victory swell, warm lo-fi tape brass",
            "duration": 2.0,
        },
        "sfx_defeat.wav": {
            "prompt": "melancholic retro synth game over tune, deep analog power down sweep, system offline failure",
            "duration": 2.2,
        },
    }

    for filename, config in sfx_tasks.items():
        print(f"\nGenerating {filename} via MusicGen AI model...")
        print(f"Prompt: {config['prompt']}")

        # MusicGen yields ~50 tokens per second
        max_new_tokens = int(config["duration"] * 50)

        inputs = processor(text=[config["prompt"]], padding=True, return_tensors="pt").to(device)

        with torch.no_grad():
            audio_values = model.generate(**inputs, max_new_tokens=max_new_tokens)

        sampling_rate = model.config.audio_encoder.sampling_rate
        audio_data = audio_values[0, 0].cpu().numpy()

        # Apply lo-fi and bitcrush post-processing to ensure dirty cyberpunk texture
        audio_data = apply_lofi_effect(audio_data, bit_depth=5, hiss_level=0.03, lowpass_window=2)

        save_wav(SFX_DIR / filename, audio_data, rate=sampling_rate)

    # Memory cleanup
    del model
    del processor
    if device == "mps":
        torch.mps.empty_cache()
    gc.collect()
    print("AI SFX Generation completed successfully.")


def generate_bgm_with_ai():
    import torch

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Loading AI Model 'facebook/musicgen-small' for BGM on device: {device}")

    from transformers import AutoProcessor, MusicgenForConditionalGeneration

    model_id = "facebook/musicgen-small"
    processor = AutoProcessor.from_pretrained(model_id)
    model = MusicgenForConditionalGeneration.from_pretrained(model_id)
    model.to(device)

    # Revised BGM tasks with optimized prompts to guarantee heavy, audible synthesizers and industrial drums
    bgm_tasks = {
        "bgm_combat_normal.wav": {
            "prompt": "heavy lo-fi cyberpunk techno combat loop, industrial bass synth, distorted retro rhythm, 110bpm",
            "duration": 10.0,
        },
        "bgm_combat_boss.wav": {
            "prompt": "heavy intense cyberpunk boss fight techno beat, aggressive distorted synthesizer, loud industrial drums, 130bpm",
            "duration": 10.0,
        },
        "bgm_combat_crisis.wav": {
            "prompt": "fast-paced lo-fi cyberpunk warning alarm loop, heartbeat kick drum, emergency siren sound, high tension, 140bpm",
            "duration": 8.0,
        },
    }

    for filename, config in bgm_tasks.items():
        print(f"\nGenerating BGM {filename} via MusicGen AI model...")
        print(f"Prompt: {config['prompt']}")

        # MusicGen yields ~50 tokens per second
        max_new_tokens = int(config["duration"] * 50)

        inputs = processor(text=[config["prompt"]], padding=True, return_tensors="pt").to(device)

        with torch.no_grad():
            audio_values = model.generate(**inputs, max_new_tokens=max_new_tokens)

        sampling_rate = model.config.audio_encoder.sampling_rate
        audio_data = audio_values[0, 0].cpu().numpy()

        # Apply Lo-Fi & Bitcrushing post-processing (more warm & dirty vibe)
        audio_data = apply_lofi_effect(audio_data, bit_depth=5, hiss_level=0.03, lowpass_window=2)

        save_wav(OUT_DIR / filename, audio_data, rate=sampling_rate)

    # Memory cleanup
    del model
    del processor
    if device == "mps":
        torch.mps.empty_cache()
    gc.collect()
    print("AI BGM Generation completed successfully.")


if __name__ == "__main__":
    print("--- SYNTHESIZING MYTHOS AUDIO ASSETS ---")

    # 1. Try AI SFX generation first
    ai_sfx_success = False
    try:
        generate_sfx_with_ai()
        ai_sfx_success = True
    except Exception as e:
        print(f"\n[WARNING] AI SFX Generation failed: {e}")
        print("Falling back to mathematical Lo-Fi DSP synthesis to guarantee files exist.")

    if not ai_sfx_success:
        print("\n--- RUNNING FALLBACK DSP SFX SYNTHESIS ---")
        synth_attack_fallback()
        synth_defend_fallback()
        synth_move_fallback()
        synth_glitch_fallback()
        synth_victory_fallback()
        synth_defeat_fallback()

    # 2. Try AI BGM generation next
    ai_bgm_success = False
    try:
        generate_bgm_with_ai()
        ai_bgm_success = True
    except Exception as e:
        print(f"\n[WARNING] AI BGM Generation failed: {e}")
        print("Falling back to mathematical Lo-Fi DSP BGM loop synthesis.")

    if not ai_bgm_success:
        print("\n--- RUNNING FALLBACK DSP BGM SYNTHESIS ---")
        synth_bgm_normal()
        synth_bgm_boss()
        synth_bgm_crisis()

    print("--- AUDIO SYNTHESIS COMPLETE ---")
