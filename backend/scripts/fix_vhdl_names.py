import os

# Base path
BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "hdl_templates", "vhdl")

def find_file(name):
    for root, dirs, files in os.walk(BASE_DIR):
        if name in files:
            return os.path.join(root, name)
    return None

RENAME_MAP = {
    "encoder_prio_10to4.vhdltpl": "encoder_10to4_priority.vhdltpl",
    "bcd_to_7seg.vhdltpl": "decoder_bcd_7seg.vhdltpl",
    "mag_comparator_4bit.vhdltpl": "comparator_4bit.vhdltpl",
    "mono_74121.vhdltpl": "monostable_74121.vhdltpl",
    "octal_transceiver.vhdltpl": "transceiver_8bit.vhdltpl",
    "timer_555.vhdltpl": "timer_555_behavioral.vhdltpl"
}

def fix():
    for old, new in RENAME_MAP.items():
        old_path = find_file(old)
        if old_path:
            new_path = os.path.join(os.path.dirname(old_path), new)
            try:
                os.rename(old_path, new_path)
                print(f"Renamed {old} -> {new}")
            except Exception as e:
                print(f"Error renaming {old}: {e}")
        else:
            print(f"Could not find {old}")

if __name__ == "__main__":
    fix()
