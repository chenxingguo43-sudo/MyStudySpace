import re
with open(r'D:\MyWorkBuddyProjects\MyStudySpace\俄语知识库.html', 'r', encoding='utf-8-sig') as f:
    c = f.read()

s = '\u0301'
print(f'重音符号: {c.count(s)} 个')
# 残留?
q = len(re.findall(r'[\u0400-\u04FF]+\?[\u0400-\u04FF]*', c))
print(f'残留 ? (俄语中): {q} 处')
# 残留??
qq = c.count('??')
print(f'残留 ?? : {qq} 处')
print(f'文件大小: {len(c.encode("utf-8"))} bytes')
# <td>中未加重音的俄语单词
unstressed = 0
for m in re.finditer(r'<td>(.*?)</td>', c, re.DOTALL):
    cell = m.group(1)
    if re.search(r'[\u0400-\u04FF]', cell) and s not in cell:
        words = re.findall(r'[\u0400-\u04FF]+', cell)
        unstressed += len(words)
print(f'<td>中未加重音的俄语单词: ~{unstressed} 个')
