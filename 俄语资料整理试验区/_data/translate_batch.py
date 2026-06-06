#!/usr/bin/env python3
"""
翻译 agent: 读取 pending/*.json，调用 MiMo API 翻译，输出到 done/*.json。
严格 JSON 对齐，失败重试，抽样复查。
"""
import json
import re
import sys
import time
import random
from datetime import datetime
from pathlib import Path

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Paths
BASE = Path(r"D:\MyStudySpace")
QUEUE_DIR = BASE / "俄语资料整理试验区" / "_translation_queue"
PENDING_DIR = QUEUE_DIR / "pending"
DONE_DIR = QUEUE_DIR / "done"
REJECTED_DIR = QUEUE_DIR / "rejected"
LOGS_DIR = QUEUE_DIR / "logs"
CONFIG_PATH = Path(r"E:\Desktop\novel-translator\config.json")

# Ensure output dirs exist
DONE_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Load API config
with open(CONFIG_PATH, "r", encoding="utf-8-sig") as f:
    config = json.load(f)

MIMO_API_KEY = config["mimo_api_key"]
MIMO_BASE_URL = config["mimo_base_url"]
MIMO_MODEL = config.get("mimo_model", "mimo-v2.5-pro")
DEEPSEEK_API_KEY = config["deepseek_api_key"]
DEEPSEEK_BASE_URL = config["deepseek_base_url"]
DEEPSEEK_MODEL = config.get("deepseek_model", "deepseek-chat")

MAX_RETRIES = 3
BATCH_DELAY = 1.0  # seconds between API calls


def call_translate_api(items: list[dict]) -> dict | None:
    """Call MiMo API for translation. Returns parsed JSON or None."""
    import httpx

    system_prompt = (
        "你是专业俄语译者，擅长将俄语语法例句和教材内容翻译成中文。\n"
        "逐条翻译输入 JSON 中每个 ru 字段。\n"
        "必须保持 i 和 sentence_id 不变，不能合并、拆分、跳过或挪动条目。\n"
        "如果 ru 是短语或残句，翻译成对应的中文短语或残句。\n"
        "如果 ru 含有日文字符「　【」等尾部标记，翻译时忽略这些标记。\n"
        "中文要自然，语法例句要突出语法点。\n"
        "只输出 JSON：{\"translations\":[{\"i\":1,\"sentence_id\":\"...\",\"zh\":\"...\",\"translation_confidence\":\"high|medium|low\",\"phrase_or_fragment\":false,\"needs_review\":false,\"notes\":\"\"}]}"
    )

    user_content = json.dumps({"items": items}, ensure_ascii=False)

    payload = {
        "model": MIMO_MODEL,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
    }

    headers = {
        "Authorization": f"Bearer {MIMO_API_KEY}",
        "Content-Type": "application/json",
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.post(MIMO_BASE_URL, json=payload, headers=headers, timeout=180)
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"]
                parsed = extract_json(content)
                if parsed and "translations" in parsed:
                    return parsed
                print(f"    Bad JSON response, attempt {attempt+1}/{MAX_RETRIES}")
            elif resp.status_code == 429:
                wait = min(2 ** attempt * 2, 30)
                print(f"    Rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"    API error {resp.status_code}: {resp.text[:200]}")
                time.sleep(2)
        except Exception as e:
            print(f"    Request error: {e}")
            time.sleep(2)

    return None


def call_deepseek_api(text: str) -> str | None:
    """Call DeepSeek API for single translation (used in review)."""
    import httpx

    payload = {
        "model": DEEPSEEK_MODEL,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": "你是专业俄语译者。把输入的俄语翻译成中文。只输出翻译结果，不要解释。"},
            {"role": "user", "content": text}
        ]
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        resp = httpx.post(DEEPSEEK_BASE_URL, json=payload, headers=headers, timeout=60)
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"    DeepSeek error: {e}")
    return None


def extract_json(content: str) -> dict | None:
    """Extract JSON from model response, handling markdown fences."""
    content = content.strip()
    candidates = [content]

    if "```" in content:
        parts = content.split("```")
        for part in parts:
            cleaned = part.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            if cleaned:
                candidates.insert(0, cleaned)

    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidates.insert(0, content[start:end + 1])

    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
    return None


def validate_batch_response(response: dict, expected_items: list[dict]) -> list[dict] | None:
    """
    Validate API response matches expected items.
    Returns list of translation dicts or None if validation fails.
    """
    translations = response.get("translations", [])
    if not translations:
        print("    Validation: no translations in response")
        return None

    expected_count = len(expected_items)
    if len(translations) != expected_count:
        print(f"    Validation: count mismatch: expected {expected_count}, got {len(translations)}")
        return None

    # Build lookup by i
    trans_by_i = {}
    for t in translations:
        i_val = t.get("i")
        if i_val is None:
            print(f"    Validation: missing 'i' in translation entry")
            return None
        trans_by_i[int(i_val)] = t

    # Validate each item
    result = []
    for item in expected_items:
        i_val = item["i"]
        t = trans_by_i.get(i_val)
        if not t:
            print(f"    Validation: missing i={i_val}")
            return None

        # Check sentence_id matches
        if t.get("sentence_id") != item["sentence_id"]:
            print(f"    Validation: sentence_id mismatch at i={i_val}: expected {item['sentence_id']}, got {t.get('sentence_id')}")
            return None

        # Check zh is non-empty
        zh = t.get("zh", "").strip()
        if not zh:
            print(f"    Validation: empty zh at i={i_val} ({item['sentence_id']})")
            return None

        # Check zh for mojibake (UTF-8-as-GBK patterns, not individual CJK chars)
        # These are byte sequences that appear when UTF-8 Russian is misread as GBK
        garbled = re.search(r'[鍦紬绋紓鎮玡琯瑖瑭瑒瑧瑮瑯瑐瑑瑳瑴瑵瑸瑹瑖碶瑐瑳瑴瑵]', zh)
        if garbled:
            print(f"    Validation: mojibake in zh at i={i_val}: {zh[:60]}")
            return None
        # Also check: if zh has zero CJK chars, it's not a valid Chinese translation
        cjk_count = sum(1 for c in zh if 0x4E00 <= ord(c) <= 0x9FFF)
        if cjk_count == 0 and len(zh) > 3:
            print(f"    Validation: no CJK in zh at i={i_val}: {zh[:60]}")
            return None

        result.append({
            "i": i_val,
            "sentence_id": item["sentence_id"],
            "source_id": item["source_id"],
            "ru": item["ru"],
            "zh": zh,
            "page_or_location": item.get("page_or_location", ""),
            "translation_confidence": t.get("translation_confidence", "medium"),
            "phrase_or_fragment": t.get("phrase_or_fragment", False),
            "needs_review": t.get("needs_review", False),
            "notes": t.get("notes", ""),
        })

    return result


def translate_batch_with_retry(batch: dict) -> tuple[list[dict], list[dict]]:
    """
    Translate a batch with retry logic.
    Returns (successful_translations, failed_items).
    """
    items = batch["items"]
    successful = []
    failed = []

    # Try full batch first
    for attempt in range(MAX_RETRIES):
        print(f"  Attempt {attempt+1}/{MAX_RETRIES} for {len(items)} items...")
        response = call_translate_api(items)
        if response:
            validated = validate_batch_response(response, items)
            if validated:
                print(f"  ✓ Full batch translated successfully")
                return validated, []
        time.sleep(1)

    # Full batch failed, try splitting
    print(f"  Full batch failed, splitting into smaller batches...")
    mid = len(items) // 2
    for sub_items in [items[:mid], items[mid:]]:
        if not sub_items:
            continue
        sub_batch = {"items": sub_items}
        for attempt in range(2):
            response = call_translate_api(sub_items)
            if response:
                validated = validate_batch_response(response, sub_items)
                if validated:
                    successful.extend(validated)
                    break
            time.sleep(1)
        else:
            # Sub-batch failed, try individual items
            for item in sub_items:
                for attempt in range(2):
                    response = call_translate_api([item])
                    if response:
                        validated = validate_batch_response(response, [item])
                        if validated:
                            successful.extend(validated)
                            break
                    time.sleep(0.5)
                else:
                    failed.append(item)

    return successful, failed


def sample_review(translations: list[dict], sample_size: int = 3) -> list[dict]:
    """DeepSeek抽样复查"""
    if len(translations) < sample_size:
        sample_size = len(translations)

    samples = random.sample(translations, sample_size)
    issues = []

    for t in samples:
        ru = t["ru"]
        mimo_zh = t["zh"]
        ds_zh = call_deepseek_api(ru)
        time.sleep(0.5)

        if ds_zh:
            # Simple check: if DeepSeek translation is very different, flag it
            if len(mimo_zh) < 2 and len(ds_zh) > 5:
                issues.append({
                    "sentence_id": t["sentence_id"],
                    "issue": "MiMo翻译过短",
                    "mimo_zh": mimo_zh,
                    "deepseek_zh": ds_zh,
                })

    return issues


def process_batch(batch_file: Path, log_lines: list[str]) -> bool:
    """Process a single batch file. Returns True if successful."""
    batch_id = batch_file.stem
    print(f"\n{'='*60}")
    print(f"Processing: {batch_id}")
    print(f"{'='*60}")

    with open(batch_file, "r", encoding="utf-8") as f:
        batch = json.load(f)

    items = batch["items"]
    print(f"  Items: {len(items)}")

    # Translate
    start_time = time.time()
    successful, failed = translate_batch_with_retry(batch)
    elapsed = time.time() - start_time

    print(f"  Successful: {len(successful)}, Failed: {len(failed)}, Time: {elapsed:.1f}s")

    # Sample review for first few batches
    if len(successful) >= 5 and random.random() < 0.3:
        print(f"  Running DeepSeek sample review...")
        issues = sample_review(successful)
        if issues:
            print(f"  ⚠ Found {len(issues)} potential issues in review")
            for issue in issues:
                print(f"    {issue['sentence_id']}: {issue['issue']}")
                log_lines.append(f"  REVIEW ISSUE: {issue['sentence_id']}: {issue['issue']} (mimo: {issue['mimo_zh'][:40]}, ds: {issue['deepseek_zh'][:40]})")

    # Save successful translations
    if successful:
        output = {
            "batch_id": batch_id,
            "translated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "provider": "mimo",
            "items_count": len(successful),
            "translations": successful,
        }
        output_path = DONE_DIR / f"{batch_id}-translations.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Saved to: {output_path}")

    # Save failed items
    if failed:
        reject_path = REJECTED_DIR / f"{batch_id}-failed.md"
        with open(reject_path, "w", encoding="utf-8") as f:
            f.write(f"# Failed translations: {batch_id}\n\n")
            for item in failed:
                f.write(f"- [{item['sentence_id']}] {item['ru'][:80]}\n")
        print(f"  ⚠ {len(failed)} items saved to: {reject_path}")

    # Move batch from pending to processed_pending
    processed_dir = QUEUE_DIR / "processed_pending"
    processed_dir.mkdir(parents=True, exist_ok=True)
    if batch_file.exists():
        batch_file.rename(processed_dir / batch_file.name)
        print(f"  ✓ Moved to processed_pending")
    else:
        print(f"  ✓ Already moved to processed_pending")

    # Log
    log_lines.append(f"{batch_id}: {len(successful)} translated, {len(failed)} failed, {elapsed:.1f}s")

    return len(failed) == 0


def main():
    # Cancel the cron job first - we're actively processing
    print("=" * 60)
    print("翻译 agent 启动 - 处理 pending 队列")
    print("=" * 60)

    # Find all pending batches
    batch_files = sorted(PENDING_DIR.glob("batch-*.json"))
    if not batch_files:
        print("No pending batches found.")
        return 0

    print(f"Found {len(batch_files)} pending batches")

    log_lines = [f"\n## {datetime.now().strftime('%Y-%m-%d %H:%M')} - 翻译开始\n"]
    log_lines.append(f"待处理批次: {len(batch_files)}")

    total_successful = 0
    total_failed = 0
    batches_done = 0

    for batch_file in batch_files:
        if not batch_file.exists():
            continue

        success = process_batch(batch_file, log_lines)
        batches_done += 1

        if success:
            total_successful += 1
        else:
            total_failed += 1

        # Delay between batches
        time.sleep(BATCH_DELAY)

    # Summary
    log_lines.append(f"\n### 翻译完成")
    log_lines.append(f"- 处理批次: {batches_done}")
    log_lines.append(f"- 成功批次: {total_successful}")
    log_lines.append(f"- 失败批次: {total_failed}")

    # Write log
    log_path = LOGS_DIR / f"translation-log-{datetime.now().strftime('%Y%m%d-%H%M')}.md"
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))
    print(f"\nLog saved to: {log_path}")

    # Update waiting log
    waiting_log = LOGS_DIR / "waiting-log.md"
    with open(waiting_log, "a", encoding="utf-8") as f:
        f.write(f"\n| {datetime.now().strftime('%H:%M')} | 翻译完成 | {batches_done} 批处理, {total_successful} 成功, {total_failed} 失败 |")

    print(f"\n{'='*60}")
    print(f"翻译完成: {batches_done} 批, {total_successful} 成功, {total_failed} 失败")
    print(f"{'='*60}")

    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
