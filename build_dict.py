import re
import os

files = ['raw_dict_1.txt', 'raw_dict_2.txt', 'raw_dict_3.txt']
out_path = 'public/dictionary.js'

dict_entries = {}

for f_name in files:
    if not os.path.exists(f_name):
        continue
    with open(f_name, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            parts = line.split('\t')
            if len(parts) < 3: continue
            
            word = parts[0]
            # Use regex to find all [ ... ] blocks
            vectors = re.findall(r'\[(.*?)\]', line)
            if len(vectors) < 3: continue
            
            v1_raw = vectors[0].split(',')
            v2_raw = vectors[1].split(',')
            v3_raw = vectors[2].split(',')
            
            full_vec = []
            for item in v1_raw + v2_raw + v3_raw:
                item = item.strip().strip("'").strip('"')
                if item.isdigit() or item.replace('.', '', 1).isdigit() or (item.startswith('-') and item[1:].replace('.', '', 1).isdigit()):
                    full_vec.append(item)
                else:
                    full_vec.append(f'"{item}"')
            
            dict_entries[word] = ", ".join(full_vec)

output = "export const dictionary = {\n"
for word, vec_str in dict_entries.items():
    output += f'  "{word}": [{vec_str}],\n'
output += "};\n"

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(output)

print(f"Successfully wrote {len(dict_entries)} words to {out_path}")
