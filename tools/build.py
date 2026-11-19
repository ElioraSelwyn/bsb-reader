"""Assemble site/reader.js from tools/reader.src.js and build the offline single-file preview."""
import json
import os
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx=json.load(open(B+'/data/index.json'))['books']
js=open(B+'/tools/reader.src.js').read().replace('/*BOOKS*/[]',json.dumps(idx,separators=(',',':')))
open(B+'/reader.js','w').write(js)
print('reader.js', len(js.encode()))
