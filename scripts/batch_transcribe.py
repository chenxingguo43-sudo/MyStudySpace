"""Batch transcribe listening-speaking audio files with faster-whisper."""
import os, sys, json, glob
from faster_whisper import WhisperModel

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

AUDIO_DIR = r"E:\Desktop\听力音频"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "listening_speaking_transcripts")

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    model = WhisperModel("base", device="cpu", compute_type="int8")
    mp3_files = sorted(glob.glob(os.path.join(AUDIO_DIR, "*.mp3")))
    print(f"Found {len(mp3_files)} mp3 files")

    done = 0
    skipped = 0
    errors = 0

    for i, mp3_path in enumerate(mp3_files):
        basename = os.path.basename(mp3_path)
        out_name = basename.replace(".mp3", ".json")
        out_path = os.path.join(OUT_DIR, out_name)

        if os.path.exists(out_path):
            skipped += 1
            continue

        try:
            print(f"[{i+1}/{len(mp3_files)}] {basename}...", flush=True)
            segments, info = model.transcribe(mp3_path, language="ru", beam_size=5)

            result = []
            for seg in segments:
                result.append({
                    "text": seg.text.strip(),
                    "startTime": round(seg.start, 3),
                    "endTime": round(seg.end, 3)
                })

            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            done += 1
            print(f"  -> {out_name} ({len(result)} segments, {round(segments[-1].end if result else 0, 0)}s)")
        except Exception as e:
            errors += 1
            print(f"  ERROR: {e}", flush=True)

    print(f"\nDone! {done} new, {skipped} skipped, {errors} errors, {len(mp3_files)} total.")

if __name__ == "__main__":
    main()
