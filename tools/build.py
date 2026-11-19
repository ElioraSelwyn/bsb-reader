"""Assemble site/reader.js from tools/reader.src.js and build the offline single-file preview."""
import json
B='/workspace/bsb-reader'
idx=json.load(open(B+'/site/data/index.json'))['books']
js=open(B+'/tools/reader.src.js').read().replace('/*BOOKS*/[]',json.dumps(idx,separators=(',',':')))
open(B+'/site/reader.js','w').write(js)
data={f'Ps/{c}':json.load(open(f'{B}/site/data/Ps/{c}.json')) for c in range(120,135)}
data['Acts/12']=json.load(open(B+'/site/data/Acts/12.json'))
css=open(B+'/site/reader.css').read()
html=open(B+'/tools/offline.tpl.html').read().replace('/*CSS*/',css).replace('/*DATA*/',json.dumps(data,ensure_ascii=False,separators=(',',':'))).replace('/*JS*/',js)
open(B+'/preview/bsb-reader-offline-preview.html','w',encoding='utf-8').write(html)
print('reader.js',len(js.encode()),'offline',len(html.encode()))
