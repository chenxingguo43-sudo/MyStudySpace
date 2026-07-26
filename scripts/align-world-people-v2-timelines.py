"""Create source-aligned listening timelines from the verified V mire lyudey media.

The textbook transcript stays canonical. Whisper word timestamps are used only to
locate that text on the verified browser MP4 files. Low-confidence matches are
written as rejected rather than inventing a usable timeline.

Usage: python scripts/align-world-people-v2-timelines.py --chapters 0,15,30
"""
import argparse
import difflib
import json
import re
from pathlib import Path

from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[1]
SEGMENTS_PATH = ROOT / "data" / "listening_speaking_segments.json"
MEDIA_ROOT = ROOT / "data" / "textbook" / "listening_speaking" / "media" / "world-people-v2"
TIMELINES_ROOT = ROOT / "data" / "textbook" / "listening_speaking" / "timelines"
MEDIA_STRUCTURE_PATH = ROOT / "data" / "textbook" / "listening_speaking" / "media-structure-audit.json"
TRANSCRIPT_CACHE_ROOT = ROOT / "tmp" / "world-people-v2-word-timestamps"


def words(text):
    return re.findall(r"[а-яё]+", text.lower().replace("ё", "е"))


def token_key(token):
    """Keep matching tolerant of common Russian inflection and ASR endings."""
    return token[:5] if len(token) >= 6 else token


def split_sentences(text):
    return [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?…])\s+(?=[А-ЯЁ«])", text.strip())
        if sentence.strip()
    ]


def speaker_info(cue):
    cue = cue.lower()
    if "женск" in cue:
        return "A", "Ж"
    if "мужск" in cue:
        return "B", "М"
    if "диктор" in cue:
        return "A", "Д"
    return "A", "Д"


def transcript_sentences(text, playlist):
    blocks = [block.strip() for block in re.split(r"\n\s*\n", text or "") if block.strip()]
    if playlist:
        # The first block is a news heading; each following paragraph maps to one file.
        result = []
        for playlist_index, block in enumerate(blocks[1:]):
            result.extend(
                {
                    "text": sentence,
                    "playlistIndex": playlist_index,
                    "speaker": "A",
                    "displayLabel": "Д",
                }
                for sentence in split_sentences(block)
            )
        return result
    result = []
    for block in blocks:
        cue_match = re.match(r"^([^:：\n]+)[:：]\s*[—-]?\s*(.*)$", block, re.DOTALL)
        cue = cue_match.group(1) if cue_match else ""
        content = cue_match.group(2).strip() if cue_match else block
        speaker, display_label = speaker_info(cue)
        result.extend(
            {
                "text": sentence,
                "playlistIndex": 0,
                "speaker": speaker,
                "displayLabel": display_label,
            }
            for sentence in split_sentences(content)
        )
    return result


def transcribe(model, media_path, model_name):
    cache_path = TRANSCRIPT_CACHE_ROOT / f"{media_path.stem}-{model_name}.json"
    if cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))
    raw_segments, _ = model.transcribe(
        str(media_path), language="ru", beam_size=5, word_timestamps=True, vad_filter=True
    )
    result = []
    for segment in raw_segments:
        for word in segment.words or []:
            token_list = words(word.word)
            if token_list:
                result.append({"token": token_list[0], "start": round(word.start, 3), "end": round(word.end, 3)})
    TRANSCRIPT_CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(result, ensure_ascii=False) + "\n", encoding="utf-8")
    return result


def align_track(source_sentences, recognized):
    """Globally align words, then score each source sentence independently."""
    expected = []
    sentence_by_word = []
    for sentence_index, sentence in enumerate(source_sentences):
        sentence_words = words(sentence["text"])
        expected.extend(sentence_words)
        sentence_by_word.extend([sentence_index] * len(sentence_words))

    matcher = difflib.SequenceMatcher(
        None,
        [token_key(token) for token in expected],
        [token_key(item["token"]) for item in recognized],
        autojunk=False,
    )
    matches_by_sentence = [[] for _ in source_sentences]
    for block in matcher.get_matching_blocks():
        for delta in range(block.size):
            expected_index = block.a + delta
            matches_by_sentence[sentence_by_word[expected_index]].append(block.b + delta)

    result = []
    for sentence, matched_indexes in zip(source_sentences, matches_by_sentence):
        expected_count = len(words(sentence["text"]))
        matched_count = len(matched_indexes)
        ratio = matched_count / expected_count if expected_count else 0
        minimum_matches = 1 if expected_count == 1 else 2 if expected_count <= 3 else 3 if expected_count <= 7 else 5
        minimum_ratio = 0.67 if expected_count <= 3 else 0.55 if expected_count <= 7 else 0.5
        span = matched_indexes[-1] - matched_indexes[0] + 1 if matched_indexes else 0
        compact_enough = span <= expected_count * 2.5 + 8
        accepted = matched_count >= minimum_matches and ratio >= minimum_ratio and compact_enough

        aligned = dict(sentence)
        aligned["matchRatio"] = round(ratio, 3)
        aligned["matchedWords"] = matched_count
        aligned["expectedWords"] = expected_count
        if accepted:
            aligned.update(
                startTime=recognized[matched_indexes[0]]["start"],
                endTime=recognized[matched_indexes[-1]]["end"],
                timingStatus="aligned",
            )
        else:
            aligned.update(startTime=0, endTime=0, timingStatus="unmatched")
            if matched_indexes:
                left = max(0, matched_indexes[0] - 4)
                right = min(len(recognized), matched_indexes[-1] + 5)
                aligned["recognizedSnippet"] = " ".join(item["token"] for item in recognized[left:right])
        result.append(aligned)
    return result


def media_numbers(chapter):
    if chapter <= 29:
        return [chapter + 1]
    if chapter <= 34:
        return list(range(31 + (chapter - 30) * 5, 36 + (chapter - 30) * 5))
    raise ValueError("Only verified V mire lyudey Выпуск 2 chapters 0-34 have media")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chapters", required=True, help="Comma-separated zero-based chapter indexes, e.g. 0,15,30")
    parser.add_argument("--model", default="base", help="faster-whisper model name, e.g. base or small")
    parser.add_argument(
        "--max-seconds",
        default="",
        help="Optional comma-separated chapter:seconds limits. Use when a media file appends a separate exercise after its source text, e.g. 20:200.",
    )
    args = parser.parse_args()
    chapters = [int(value) for value in args.chapters.split(",") if value.strip()]
    media_structure = json.loads(MEDIA_STRUCTURE_PATH.read_text(encoding="utf-8")) if MEDIA_STRUCTURE_PATH.exists() else {"tracks": {}}
    max_seconds = {}
    for value in args.max_seconds.split(","):
        if not value.strip():
            continue
        chapter_text, seconds_text = value.split(":", 1)
        max_seconds[int(chapter_text)] = float(seconds_text)
    segments = json.loads(SEGMENTS_PATH.read_text(encoding="utf-8"))
    TIMELINES_ROOT.mkdir(parents=True, exist_ok=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")

    for chapter in chapters:
        source = segments[chapter]
        tracks = media_numbers(chapter)
        source_sentences = transcript_sentences(source.get("audioTranscript", ""), len(tracks) > 1)
        playlist_indexes = {item["playlistIndex"] for item in source_sentences}
        if len(tracks) > 1 and playlist_indexes != set(range(len(tracks))):
            raise ValueError(f"Chapter {chapter}: source transcript does not map cleanly to {len(tracks)} tracks")

        aligned_sentences = []
        for playlist_index, track in enumerate(tracks):
            media_path = MEDIA_ROOT / f"{track:02d}.mp4"
            recognized = transcribe(model, media_path, args.model)
            audited_limit = media_structure.get("tracks", {}).get(f"{track:02d}", {}).get("featureEndSeconds")
            limit = max_seconds.get(chapter, audited_limit)
            if limit is not None:
                recognized = [item for item in recognized if item["start"] < limit]
            track_sentences = [item for item in source_sentences if item["playlistIndex"] == playlist_index]
            aligned_sentences.extend(align_track(track_sentences, recognized))

        timed_count = sum(item["timingStatus"] == "aligned" for item in aligned_sentences)
        if timed_count == len(aligned_sentences):
            status = "verified"
        elif timed_count:
            status = "partial"
        else:
            status = "rejected"

        payload = {
            "chapter": chapter,
            "source": "verified-world-people-v2-media",
            "model": args.model,
            "mediaStructure": media_structure.get("tracks", {}).get(f"{tracks[0]:02d}", {}),
            "status": status,
            "segments": aligned_sentences,
            "reviewQueue": [
                {
                    "playlistIndex": item["playlistIndex"],
                    "text": item["text"],
                    "matchRatio": item["matchRatio"],
                    "recognizedSnippet": item.get("recognizedSnippet", ""),
                }
                for item in aligned_sentences
                if item["timingStatus"] == "unmatched"
            ],
        }
        output = TIMELINES_ROOT / f"ch{chapter:04d}.json"
        output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"ch{chapter:04d}: {payload['status']} ({timed_count}/{len(aligned_sentences)} source sentences aligned)")


if __name__ == "__main__":
    main()
