import argparse
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'docs/journey-photography-prompts.json').read_text())
outputs = []
for scene in manifest['scenes']:
    image = Image.open(args.source_dir / scene['source_png']).convert('RGB')
    for suffix, width, quality in [('', 1536, 87), ('-mobile', 840, 84)]:
        height = round(image.height * width / image.width)
        output = root / 'assets' / f"hi-journey-photo-{scene['key']}{suffix}.webp"
        image.resize((width, height), Image.Resampling.LANCZOS).save(output, quality=quality, method=6)
        outputs.append({'file': output.name, 'width': width, 'height': height, 'bytes': output.stat().st_size})
print(json.dumps({'files': outputs, 'bytes': sum(item['bytes'] for item in outputs)}, indent=2))
