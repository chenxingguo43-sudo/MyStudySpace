import re

with open(r'D:\MyWorkBuddyProjects\俄语备考\_backups\俄语口语备考_终极整合版_backup_before_stress.html', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Find all section divs
sections = re.findall(r'id="(s\d+)"', content)
unique = sorted(set(sections), key=lambda x: int(x[1:]))
print('Sections in backup:')
for s in unique:
    print(f'  {s}')
print(f'\nTotal: {len(unique)} sections')
print(f'File size: {len(content)} chars')
print(f'Has stress marks: {content.count(chr(0x0301))}')

# Check for ?? 
qq = re.findall(r'.{0,20}\?\?.{0,20}', content)
print(f'\n?? occurrences: {len(qq)}')
if qq:
    print('First 5 ?? contexts:')
    for ctx in qq[:5]:
        print(f'  ...{ctx}...')
