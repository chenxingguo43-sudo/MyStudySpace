# 俄语 B2 错题本验收记录（2026-07-16）

## 自动化验收

- `npm run test:russian-b2`：43/43 通过。
- `node scripts/russian-b2/build-six-part-book.js`：恢复并确认 6 个原书部分（P1–P6）读者数据。
- `node scripts/russian-b2/verify-source-ledger.js`：所有已发布来源台账已核对。
- `git diff --check`：通过。

## 浏览器验收

在独立的本地验收端口 `http://localhost:3001/reader.html` 中，以实际作答生成一条 P2-Q001 错题后验证：

1. 书架显示“📕 错题复习”，并显示待掌握题数。
2. P2 练习页显示“本部分错题 1 题”快捷入口。
3. 进入错题本后，部分筛选为 P2；知识点筛选“名词与形容词的支配格”仍保留 P2-Q001。
4. 点击条目后，页面定位并高亮 `P2-Q001`；可见题目标题和所选错误答案。

验收使用的是独立端口的新浏览器存储空间，未读取或修改用户的既有学习进度。
