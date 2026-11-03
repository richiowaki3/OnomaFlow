"""
update_dict_from_onomadict.py
=============================================================================
Synchronize latest enriched onomatopoeia dictionary from OnomaDict to OnomaFlow.
- Loads `onomatopoeia_dictionary_jp_enriched.json` (2,143 entries)
- Normalizes word keys to Hiragana for seamless lookup
- Fills missing extended / phrasing parameters for newly added 3D Mocap entries
- Preserves 3D Mocap Kinematics (Jerk, Torsion, Stiffness, Modulation Profile)
- Writes standalone `onomatopoeia_dictionary.js` for OnomaFlow (Three.js client)
=============================================================================
"""

import os
import sys
import json
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
ONOMA_DICT_CANDIDATES = [
    BASE_DIR.parent / "OnomaDict" / "data" / "jp" / "onomatopoeia_dictionary_jp_enriched.json",
    Path(r"D:\Antigravity_Work\OnomaDict\data\jp\onomatopoeia_dictionary_jp_enriched.json"),
    BASE_DIR / "onomatopoeia_dictionary_jp_enriched.json",
]

TARGET_JS_PATH = BASE_DIR / "onomatopoeia_dictionary.js"

def to_hiragana(text: str) -> str:
    """Convert Katakana characters to Hiragana."""
    res = []
    for c in text:
        code = ord(c)
        if 0x30A1 <= code <= 0x30F6:
            res.append(chr(code - 0x60))
        else:
            res.append(c)
    return "".join(res)

def derive_color_hex(temp_ord: float, hardness: float, flow: float, moisture: float) -> str:
    r = min(max(int((temp_ord / 9.0) * 200 + (hardness / 9.0) * 55), 0), 255)
    g = min(max(int(80 + (flow / 9.0) * 80 - (temp_ord / 9.0) * 50), 0), 255)
    b = min(max(int(255 - (temp_ord / 9.0) * 150 + (moisture / 9.0) * 50), 0), 255)
    return f"#{r:02x}{g:02x}{b:02x}".upper()

def sync():
    source_path = None
    for p in ONOMA_DICT_CANDIDATES:
        if p.exists():
            source_path = p
            break

    if not source_path:
        raise FileNotFoundError(f"Could not find OnomaDict JP enriched json in candidates: {ONOMA_DICT_CANDIDATES}")

    print(f"Loading source dictionary: {source_path}")
    with open(source_path, "r", encoding="utf-8") as f:
        raw_entries = json.load(f)

    print(f"Loaded {len(raw_entries)} raw entries from OnomaDict.")

    processed_dict = {}
    duplicates = 0
    mocap_count = 0

    for item in raw_entries:
        orig_word = item.get("word", "").strip()
        if not orig_word:
            continue

        hira_word = to_hiragana(orig_word)
        
        # Build clean entry
        entry = dict(item)
        entry["word_display"] = orig_word
        entry["word"] = hira_word

        # Ensure effort exists
        effort = entry.get("effort") or {}
        w = float(effort.get("weight", 5))
        t = float(effort.get("time", 5))
        sp = float(effort.get("space", 5))
        fl = float(effort.get("flow", 5))
        entry["effort"] = {
            "weight": round(w, 2) if isinstance(w, float) else w,
            "time": round(t, 2) if isinstance(t, float) else t,
            "space": round(sp, 2) if isinstance(sp, float) else sp,
            "flow": round(fl, 2) if isinstance(fl, float) else fl
        }

        # Ensure acoustic exists
        acoustic = entry.get("acoustic") or {}
        hd = float(acoustic.get("hardness", 5))
        ms = float(acoustic.get("moisture", 5))
        freq_hz = float(acoustic.get("freq_hz", 440.0))
        freq_norm = acoustic.get("freq_norm")
        if freq_norm is None:
            freq_norm = min(max((freq_hz - 100.0) / 150.0, 0.0), 9.0)
        freq_norm = float(freq_norm)
        decay = float(acoustic.get("decay", 5))

        entry["acoustic"] = {
            "hardness": round(hd, 2),
            "moisture": round(ms, 2),
            "freq_hz": round(freq_hz, 1),
            "freq_norm": round(freq_norm, 2),
            "decay": round(decay, 2)
        }

        # Ensure extended exists
        extended = entry.get("extended")
        if not extended:
            reynolds = round(min(max(fl * 1000.0 + t * 200.0, 100.0), 10000.0), 1)
            reynolds_norm = round(reynolds / 1111.0, 2)
            boyle = round(min(max(9.0 - fl, 0.0), 9.0), 1)
            temp_ord = round(min(max(10.0 - ms, 0.0), 9.0), 1)
            color_hex = derive_color_hex(temp_ord, hd, fl, ms)

            entry["extended"] = {
                "reynolds": reynolds,
                "reynolds_norm": reynolds_norm,
                "boyle": boyle,
                "temp_code": "m",
                "temp_ord": temp_ord,
                "color_hex": color_hex,
                "lab": [50.0, 0.0, 0.0]
            }
        else:
            if "color_hex" not in extended or not extended["color_hex"]:
                temp_ord = float(extended.get("temp_ord", 5.0))
                extended["color_hex"] = derive_color_hex(temp_ord, hd, fl, ms)
            if "reynolds_norm" not in extended:
                reynolds = float(extended.get("reynolds", 2000.0))
                extended["reynolds_norm"] = round(reynolds / 1111.0, 2)

        # Ensure phrasing exists
        phrasing = entry.get("phrasing")
        if not phrasing:
            entry["phrasing"] = {
                "accent": round(w, 1),
                "contour": 5.0,
                "meter": 4,
                "regularity": 6
            }

        if "mocap_kinematics" in entry or "measured_16d" in entry:
            mocap_count += 1

        # Check duplicate (if exists, prefer Mocap-calibrated or richer entry)
        if hira_word in processed_dict:
            duplicates += 1
            existing = processed_dict[hira_word]
            if "mocap_kinematics" in entry and "mocap_kinematics" not in existing:
                processed_dict[hira_word] = entry
        else:
            processed_dict[hira_word] = entry

    final_list = list(processed_dict.values())
    print(f"Processed entries: {len(final_list)} (Duplicates merged: {duplicates}, Mocap entries: {mocap_count})")

    # Serialize to JS variable
    header = (
        "// OnomaDict dictionary wrapped as a JS variable for local standalone execution\n"
        f"// Auto-synchronized from OnomaDict (v4.0 Enriched + 3D Mocap Kinematics)\n"
        f"// Total entries: {len(final_list):,}\n"
        "const ONOMA_DICT = "
    )
    
    json_str = json.dumps(final_list, ensure_ascii=False, indent=2)
    js_content = header + json_str + ";\n"

    with open(TARGET_JS_PATH, "w", encoding="utf-8") as f:
        f.write(js_content)

    file_size_mb = TARGET_JS_PATH.stat().st_size / (1024 * 1024)
    print(f"[OK] Written {len(final_list):,} entries to {TARGET_JS_PATH} ({file_size_mb:.2f} MB)")

if __name__ == "__main__":
    sync()
