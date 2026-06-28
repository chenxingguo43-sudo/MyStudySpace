import re

with open(r'D:\MyWorkBuddyProjects\MyStudySpace\俄语知识库.html', 'r', encoding='utf-8-sig') as f:
    c = f.read()

print('=== 文件完整性检查 ===')
print('文件大小:', len(c), '字符')
print('包含 <html>:', '<html' in c)
print('包含 </html>:', '</html>' in c)
print('<script> 数量:', c.count('<script>'))
print('</script> 数量:', c.count('</script>'))

# 检查章节
sections = re.findall(r'id="(s\d+)"', c)
unique = sorted(set(sections), key=lambda x: int(x[1:]))
print('\n章节总数:', len(unique))
print('章节列表:', unique)

# 检查关键功能
print('\n=== 功能检查 ===')
print('B2考试模块:', 'b2' in c.lower() or 'TRKI' in c)
print('番茄钟相关:', '番茄' in c or 'pomodoro' in c.lower())
print('统计功能:', 'stats' in c.lower() or '统计' in c)
print('遮挡功能:', 'blur' in c.lower() or '遮挡' in c)
print('位置记忆:', 'scroll' in c.lower())
print('遍数记录:', '遍' in c and 'clickable' in c)

# HTML完整性
html_start = c.find('<html')
html_end = c.rfind('</html>')
print('\n=== HTML结构 ===')
print('html开始标签位置:', html_start)
print('html结束标签位置:', html_end)
if html_start >= 0 and html_end > html_start:
    print('✅ HTML结构完整')
else:
    print('❌ HTML结构损坏！')

# 编码检查
stress = c.count('\u0301')
q_in_ru = len(re.findall(r'[\u0400-\u04FF]+\?[\u0400-\u04FF]*', c))
qq = c.count('??')
print('\n=== 编码检查 ===')
print('重音符号:', stress)
print('俄语中的 ? :', q_in_ru)
print('?? :', qq)
