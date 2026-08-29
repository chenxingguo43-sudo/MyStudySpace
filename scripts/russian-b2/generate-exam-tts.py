#!/usr/bin/env python3
"""真题·听力 TTS 音频生成（B2 真题模拟 · 听力 25 题）。

为 5 段听力材料（对话 1–5、广告 6–10、电影 11–15、新闻 16–20、采访 21–25）
生成 MP3 音频与 WebVTT 字幕，输出到：
  data/textbook/russian_b2/modules/exam/media/exam-listening/<piece>.mp3|.vtt

使用 edge-tts 7.2.8（同 requirements-russian-b2.txt 固定版本）。
用法:
  python scripts/russian-b2/generate-exam-tts.py            # 生成全部 5 段
  python scripts/russian-b2/generate-exam-tts.py --check    # 只校验产物存在
"""

import asyncio
import json
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    import edge_tts
except ImportError:
    print("请先安装 edge-tts: python -m pip install -r requirements-russian-b2.txt")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
EXAM_DIR = ROOT / "data" / "textbook" / "russian_b2" / "modules" / "exam"
MEDIA_DIR = EXAM_DIR / "media" / "exam-listening"
CHAPTER_FILE = EXAM_DIR / "ch0004.json"

DEFAULT_VOICE = "ru-RU-DmitryNeural"
FEMALE_VOICE = "ru-RU-SvetlanaNeural"
PAUSE_AFTER_SPEAKER_MS = 450
PAUSE_AFTER_SEGMENT_MS = 250


def load_pieces():
    chapter = json.loads(CHAPTER_FILE.read_text(encoding="utf-8"))
    voice_map = {}
    for piece in chapter["audio"]["pieces"]:
        segments = [s for s in chapter["transcriptSegments"] if s.get("pieceId") == piece["id"]]
        speakers = []
        for segment in segments:
            label = segment.get("displayLabel") or segment.get("speaker") or ""
            if label and label not in speakers:
                speakers.append(label)
        # 对话段落按说话人交替分配男女声；独白/播音用单一声部
        piece_voices = {}
        for index, label in enumerate(speakers):
            piece_voices[label] = DEFAULT_VOICE if index % 2 == 0 else FEMALE_VOICE
        voice_map[piece["id"]] = piece_voices or {segments[0].get("displayLabel", "Диктор"): DEFAULT_VOICE}
    return chapter["audio"]["pieces"], chapter["transcriptSegments"], voice_map


def vtt_timestamp(seconds: float) -> str:
    milliseconds = int(round(seconds * 1000))
    hours, remainder = divmod(milliseconds, 3600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


async def synthesize_piece(piece, segments, voice_map, rate="+0%"):
    """逐句生成音频并拼接，同时累计时间轴写 WebVTT。"""
    audio = edge_tts.Communicate
    piece_id = piece["id"]
    mp3_path = MEDIA_DIR / f"{piece_id}.mp3"
    vtt_path = MEDIA_DIR / f"{piece_id}.vtt"

    chunk_files = []
    timeline = []
    offset = 0.0
    for index, segment in enumerate(segments):
        label = segment.get("displayLabel") or segment.get("speaker") or ""
        voice = voice_map.get(label, DEFAULT_VOICE)
        chunk_path = MEDIA_DIR / f"_chunk_{piece_id}_{index:02d}.mp3"
        communicate = audio(segment["text"], voice, rate=rate)
        await communicate.save(str(chunk_path))
        duration = chunk_path.stat().st_size and estimate_duration(chunk_path)
        chunk_files.append((chunk_path, duration))
        timeline.append({
            "label": f"{label}: {segment['text']}",
            "start": offset,
            "end": offset + duration,
        })
        offset += duration
        pause = PAUSE_AFTER_SPEAKER_MS if index + 1 < len(segments) else 0
        if not pause:
            pause = 0
        offset += pause / 1000

    # 用 ffmpeg concat 拼接（Windows 自带 ffmpeg；缺失时退化为逐句独立文件不可用，直接报错）
    concat_list = MEDIA_DIR / f"_concat_{piece_id}.txt"
    with concat_list.open("w", encoding="utf-8") as handle:
        for chunk_path, _ in chunk_files:
            handle.write(f"file '{chunk_path.as_posix()}'\n")
    import subprocess
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(mp3_path)],
        check=True, capture_output=True,
    )
    concat_list.unlink(missing_ok=True)
    for chunk_path, _ in chunk_files:
        chunk_path.unlink(missing_ok=True)

    lines = ["WEBVTT", ""]
    for index, item in enumerate(timeline, start=1):
        lines.append(str(index))
        lines.append(f"{vtt_timestamp(item['start'])} --> {vtt_timestamp(item['end'])}")
        lines.append(item["label"])
        lines.append("")
    vtt_path.write_text("\n".join(lines), encoding="utf-8")
    return piece_id, mp3_path, vtt_path


def estimate_duration(mp3_path: Path) -> float:
    """ffprobe 读取时长（秒）；失败时按 128kbps 粗估。"""
    import subprocess
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(mp3_path)],
            check=True, capture_output=True, text=True,
        )
        return float(result.stdout.strip())
    except Exception:
        return max(1.0, mp3_path.stat().st_size / (128000 / 8))


async def generate_all():
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    pieces, segments_by, voice_map = load_pieces()
    sem = asyncio.Semaphore(2)
    for piece in pieces:
        piece_segments = [s for s in segments_by if s.get("pieceId") == piece["id"]]
        async with sem:
            piece_id, mp3_path, vtt_path = await synthesize_piece(piece, piece_segments, voice_map)
        print(f"[ok] {piece_id}: {mp3_path.name} ({mp3_path.stat().st_size} bytes), {vtt_path.name}")


def check_outputs():
    pieces, _, _ = load_pieces()
    missing = []
    for piece in pieces:
        for suffix in (".mp3", ".vtt"):
            target = MEDIA_DIR / f"{piece['id']}{suffix}"
            if not target.exists() or target.stat().st_size == 0:
                missing.append(str(target.relative_to(ROOT)))
    if missing:
        print("缺少产物:")
        for item in missing:
            print(" -", item)
        sys.exit(1)
    print(f"OK: {len(pieces)} 段音频与字幕齐全")


def main():
    if "--check" in sys.argv:
        check_outputs()
        return
    asyncio.run(generate_all())
    check_outputs()


if __name__ == "__main__":
    main()
