#!/usr/bin/env python3
"""Simple audio encoder for Beats using Librosa.

Loads an input file, trims or pads to 12 seconds, normalizes,
outputs a processed WAV file and accompanying metadata JSON.
"""
from pathlib import Path
import sys
import json
import librosa
import soundfile as sf
import numpy as np


def encode(input_path: Path, out_audio: Path, out_meta: Path, target_sr: int = 44100) -> None:
    y, _ = librosa.load(str(input_path), sr=target_sr, mono=True)
    max_len = target_sr * 12
    if len(y) > max_len:
        y = y[:max_len]
    else:
        y = librosa.util.fix_length(y, max_len)

    y = librosa.util.normalize(y)
    sf.write(str(out_audio), y, target_sr)

    mel = librosa.feature.melspectrogram(y=y, sr=target_sr)
    data = {
        "duration": librosa.get_duration(y=y, sr=target_sr),
        "mel_spectrogram": mel.mean(axis=1).tolist(),
    }
    out_meta.write_text(json.dumps(data))


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python librosa_encoder.py input.wav output.wav metadata.json")
        sys.exit(1)
    in_file = Path(sys.argv[1])
    out_audio = Path(sys.argv[2])
    out_meta = Path(sys.argv[3])
    encode(in_file, out_audio, out_meta)
