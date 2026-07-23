# 03 Workflows

## 通用工作流

每个任务遵循以下顺序：

1. 阅读强制性 harness 和源文件
2. 重述分配的角色、范围、输入、输出和禁止区域
3. 检查当前输出目录
4. 新任务或高风险任务先运行小样本
5. 在指定衍生目录中生成产物
6. 运行可用的验证检查
7. 编写完成报告
8. 停止并等待审核后再进行正式集成

---

## OCR → 学习单元 整体流水线

```
Stage 0: Intake (当前)
    │
    ▼
Stage 1: Google Docs OCR → 原始OCR/page_*.md
    │
    ▼
Stage 2: 质量地图 (每页 GOOD/REVIEW/POOR)
    │
    ▼
Stage 3: 范围地图 (按模块划分文本/任务边界)
    │
    ▼
Stage 4: 衍生层 (并行)
    ├── Agent B: 翻译
    ├── Agent A: 例句匹配
    └── Agent C: 卡片
    │
    ▼
Stage 5: Agent E: 学习单元 (按模块分批)
    │
    ▼
Stage 6: Agent D: 审核门
    │
    ▼
Stage 7: 封版清理
```

---

## 混合型项目的批次规划

由于本书包含 5 个模块 + 真题套卷，建议按模块分批：

1. **Pilot batch:** 阅读模块前 2 篇文章（验证流水线）
2. **Batch 2:** 阅读模块剩余
3. **Batch 3:** 写作模块
4. **Batch 4:** 会话模块
5. **Batch 5:** 听力模块
6. **Batch 6:** 语法词汇模块
7. **Batch 7:** 真题套卷
8. **Final:** 全项目审核 + 封版

每次批次完成后运行 `scripts/validate_learning_units.py` 和 `scripts/plan_next_batch.py`。
