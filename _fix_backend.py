import re
with open('netlify/functions/reviews.js', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("'Cache-Control': 'public, max-age=300'", "'Cache-Control': 'no-cache'")
with open('netlify/functions/reviews.js', 'w', encoding='utf-8', newline=chr(10)) as f:
    f.write(content)
print('Backend fixed')
