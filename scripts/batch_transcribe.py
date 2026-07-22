"""Batch transcribe listening-speaking audio files with faster-whisper."""
import os, json, glob
from faster_whisper import WhisperModel

AUDIO_DIR = r"E:\Desktop\听力音频"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "listening_speaking_transcripts")

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    model = WhisperModel("base", device="cpu", compute_type="int8")
    mp3_files = sorted(glob.glob(os.path.join(AUDIO_DIR, "*.mp3")))
    print(f"Found {len(mp3_files)} mp3 files")

    for mp3_path in mp3_files:
        basename = os.path.basename(mp3_path)
        out_name = basename.replace(".mp3", ".json")
        out_path = os.path.join(OUT_DIR, out_name)

        if os.path.exists(out_path):
            print(f"SKIP {basename} — already exists")
            continue

        print(f"Transcribing {basename}...", flush=True)
        segments, info = model.transcribe(mp3_path, language="ru", beam_size=5)
        print(f"  Detected: {info.language} (p={info.language_probability:.2f})")

        result = []
        for seg in segments:
            result.append({
                "text": seg.text.strip(),
                "startTime": round(seg.start, 3),
                "endTime": round(seg.end, 3)
            })
            print(f"  [{seg.start:.1f}s - {seg.end:.1f}s] {seg.text.strip()[:80]}")

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"  → {out_name} ({len(result)} segments)")

    print(f"\nDone! Processed {len(mp3_files)} files.")

if __name__ == "__main__":
    main()
