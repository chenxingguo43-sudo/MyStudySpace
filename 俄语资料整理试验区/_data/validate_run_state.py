#!/usr/bin/env python3
"""
validate_run_state.py — 验证 run state 是否满足停止条件
用法: python validate_run_state.py [run_dir]
退出码: 0 = 可以停止, 1 = 不允许停止
"""
import json, sys, os
from pathlib import Path
from datetime import datetime

def find_latest_run(runs_dir: str) -> Path:
    """找到最新的 run 目录"""
    runs = Path(runs_dir)
    run_dirs = sorted([d for d in runs.iterdir() if d.is_dir() and d.name.startswith("run-")])
    if not run_dirs:
        return None
    return run_dirs[-1]

def validate_run_state(run_dir: Path) -> dict:
    """验证 run state，返回 {can_stop: bool, reasons: []}"""
    reasons = []
    state_file = run_dir / "RUN_STATE.json"
    final_report = run_dir / "FINAL_REPORT.md"
    success_file = run_dir / "SUCCESS_SOURCES.md"
    failed_file = run_dir / "FAILED_SOURCES.md"

    # 1. RUN_STATE.json 必须存在
    if not state_file.exists():
        return {"can_stop": False, "reasons": ["RUN_STATE.json 不存在"]}

    with open(state_file, encoding="utf-8") as f:
        state = json.load(f)

    success_count = state.get("successful_imports", 0)
    failed_count = state.get("failed_sources", 0)
    last_validate = state.get("last_validate_status", "PENDING")
    final_written = state.get("final_report_written", False)

    # 2. 成功导入至少 5 份
    if success_count < 5:
        reasons.append(f"成功导入 {success_count} 份，不足 5 份")

    # 3. 每份成功资料都有 commit（通过 SUCCESS_SOURCES.md 检查）
    if success_count > 0 and not success_file.exists():
        reasons.append("SUCCESS_SOURCES.md 不存在，无法确认 commit")

    # 4. 最近一次 validate 为 PASS
    if last_validate != "PASS":
        reasons.append(f"最近一次 validate 状态: {last_validate}，需要 PASS")

    # 5. FINAL_REPORT.md 已写
    if not final_written or not final_report.exists():
        reasons.append("FINAL_REPORT.md 未写")

    # 6. 检查 pending/failure 状态
    pending_dir = run_dir.parent / "_translation_queue" / "pending"
    if pending_dir.exists():
        pending_files = list(pending_dir.glob("*.json"))
        # pending 翻译队列不阻止停止，但需要在报告中说明

    can_stop = len(reasons) == 0
    return {"can_stop": can_stop, "reasons": reasons, "state": state}

def main():
    if len(sys.argv) >= 2:
        run_dir = Path(sys.argv[1])
    else:
        # 自动查找
        script_dir = Path(__file__).parent
        runs_dir = script_dir.parent / "_runs"
        run_dir = find_latest_run(runs_dir)
        if not run_dir:
            print("❌ 没有找到任何 run 目录")
            sys.exit(1)

    result = validate_run_state(run_dir)
    state = result.get("state", {})

    print(f"=== Run State 验证: {'可以停止' if result['can_stop'] else '不允许停止'} ===")
    print(f"Run 目录: {run_dir}")
    print(f"成功导入: {state.get('successful_imports', 0)}")
    print(f"失败资料: {state.get('failed_sources', 0)}")
    print(f"最近 validate: {state.get('last_validate_status', 'PENDING')}")
    print(f"FINAL_REPORT: {'已写' if state.get('final_report_written') else '未写'}")

    if result["reasons"]:
        print(f"\n--- 不满足条件 ({len(result['reasons'])}) ---")
        for r in result["reasons"]:
            print(f"  ❌ {r}")

    sys.exit(0 if result["can_stop"] else 1)

if __name__ == "__main__":
    main()
