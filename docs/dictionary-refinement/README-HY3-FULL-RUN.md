# HY3 教材词精修流程

## 批次文件（教材相关，共 1,051 词）

| 文件 | 词数 | 内容 |
|---|---|---|
| `hy3-batches-textbook/hy3-textbook-batch-01.txt` | 600 | 教材词：古汉语垃圾释义重写 + OCR乱码 + 例句误填 + 词性缺失 |
| `hy3-batches-textbook/hy3-textbook-batch-02.txt` | 451 | 同上（续） |

覆盖：教材中实际出现、但当前释义是古汉语垃圾（693）、OCR乱码（252）、例句误填（9）、词性缺失（107）的词。

## 操作步骤

1. **打开 `hy3-textbook-batch-01.txt`，全选复制**，粘贴给 Workbuddy（混元 HY3）
2. **把 HY3 回复保存**为 txt，如 `hy3-results/output-01.txt`
3. 跑第 2 批，回复存为 `output-02.txt`
4. 全部跑完后，处理：

```bash
node docs/dictionary-refinement/process-hy3-outputs.js docs/dictionary-refinement/hy3-results
```

脚本自动：校验格式 → 过滤"待人工核对"残缺条目 → 合并进 `data/dictionary/reviewed-lexical-entries.json`

## 注意事项

- **HY3 回复可能截断**：对照批次文件序号，把没输出的词重新粘贴一次
- **不覆盖人工核对**：source 含"人工核对"的自动跳过
- **合并后记得**：bump `reader.html` 的 `DICTIONARY_DATA_VERSION`（约 6701 行）
- **备份点**：`git checkout d8af5ffa~1 -- data/dictionary/reviewed-lexical-entries.json`

## 下次任务（可选）

- `grammar-table-list.json` — 2,300 个教材实词缺变格变位表，需要专门的变位表生成提示词模板
- `refine-list.json` — 全量待修清单（34,691 条，含非教材生僻词）
- `unified-dictionary.json` — 7 词库合并的统一词典（99,751 条）
