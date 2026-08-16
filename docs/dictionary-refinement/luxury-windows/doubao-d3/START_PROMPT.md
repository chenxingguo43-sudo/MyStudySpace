请把工作空间设为当前文件夹，并持续完成俄语学习词典词条编写任务。

先阅读本目录的 `TASK.md` 和 `input/` 下全部批次文件。之后按 `input/luxury-batch-21.txt` 到 `input/luxury-batch-25.txt` 的顺序，连续完成每个批次：

1. 每个词编写一个 JSON 学习词条（字段结构见批次文件头部的"输出规则"）
2. 每批完成后，把该批全部词条 JSON 写入 `output/luxury-batch-NN.json`（一个文件包含该批所有词条，数组格式）
3. 写 `output/REPORT-NN.md`：列出本批编写要点、最需人工复核的俄语风险
4. 每批完成后运行 `node validate-luxury-batch.js NN` 验证，失败必须先修复

完成后更新 `PROGRESS.md`。不要访问本目录之外的文件，不要修改 `input/` 下的批次文件。
