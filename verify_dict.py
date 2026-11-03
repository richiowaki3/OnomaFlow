import json

def test():
    with open('onomatopoeia_dictionary.js', 'r', encoding='utf-8') as f:
        content = f.read()

    prefix = 'const ONOMA_DICT = '
    start = content.find(prefix) + len(prefix)
    end = content.rfind(';')
    data = json.loads(content[start:end])

    print(f'Successfully parsed {len(data)} entries.')

    lookup_words = ['あたふた', 'あっ', 'カクカク', 'ふさり', 'わっせわっせ', 'すとん']
    for w in lookup_words:
        hw = ''.join(chr(ord(c)-0x60) if 0x30a1<=ord(c)<=0x30f6 else c for c in w)
        found = next((item for item in data if item['word'] == hw), None)
        if found:
            print(f'Lookup "{w}" -> Found: {found["word"]} (Effort: {found["effort"]}, Color: {found["extended"]["color_hex"]})')
        else:
            print(f'Lookup "{w}" -> Not found!')

if __name__ == '__main__':
    test()
