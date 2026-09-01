import asyncio
import edge_tts
import sys
import json
import os

VOICES = {
    'en': 'en-US-BrianNeural', # Consistent, natural, warm neural narrator
    'ar': 'ar-SA-HamedNeural',
    'tr': 'tr-TR-AhmetNeural',
    'fr': 'fr-FR-HenriNeural',
    'id': 'id-ID-ArdiNeural',
    'ur': 'ur-PK-AsadNeural'
}

async def generate_narration(text, voice, out_path, rate="+0%", pitch="+0Hz", volume="+0%"):
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume)
    await communicate.save(out_path)
    print(f"Generated: {out_path}")

def main():
    if len(sys.argv) < 4:
        print("Usage: python tts_gen.py <text> <lang_or_voice> <output_file>")
        sys.exit(1)

    text = sys.argv[1]
    voice_key = sys.argv[2]
    out_path = sys.argv[3]

    voice = VOICES.get(voice_key, voice_key)
    asyncio.run(generate_narration(text, voice, out_path))

if __name__ == "__main__":
    main()
