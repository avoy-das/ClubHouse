import sys
import os
from PIL import Image, ExifTags

def main():
    if len(sys.argv) < 3:
        print("Usage: python optimize_image.py <input_path> <output_path> [max_width] [quality]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    max_width = 1200
    if len(sys.argv) > 3:
        try:
            max_width = int(sys.argv[3])
        except ValueError:
            pass

    quality = 80
    if len(sys.argv) > 4:
        try:
            quality = int(sys.argv[4])
        except ValueError:
            pass

    if not os.path.exists(input_path):
        print(f"Error: Input file {input_path} does not exist.")
        sys.exit(1)

    try:
        with Image.open(input_path) as img:
            ext = os.path.splitext(output_path)[1].lower()
            
            # Handle orientation if present in EXIF
            try:
                # Find orientation tag key
                orientation_tag = None
                for key, val in ExifTags.TAGS.items():
                    if val == 'Orientation':
                        orientation_tag = key
                        break
                
                if orientation_tag is not None:
                    exif = img._getexif()
                    if exif is not None:
                        orientation = exif.get(orientation_tag, None)
                        if orientation == 3:
                            img = img.rotate(180, expand=True)
                        elif orientation == 6:
                            img = img.rotate(270, expand=True)
                        elif orientation == 8:
                            img = img.rotate(90, expand=True)
            except Exception as exif_err:
                print(f"Exif processing warning: {str(exif_err)}")

            width, height = img.size
            if width > max_width:
                ratio = max_width / float(width)
                new_height = int(float(height) * float(ratio))
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
            # Save format options
            save_args = {}
            if ext in ['.jpg', '.jpeg']:
                if img.mode in ('RGBA', 'LA'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    alpha = img.split()[-1]
                    background.paste(img, mask=alpha)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                save_args['quality'] = quality
                save_args['optimize'] = True
            elif ext == '.webp':
                save_args['quality'] = quality
                save_args['method'] = 6
            elif ext == '.png':
                save_args['optimize'] = True
                
            out_dir = os.path.dirname(output_path)
            if out_dir and not os.path.exists(out_dir):
                os.makedirs(out_dir, exist_ok=True)
                
            img.save(output_path, **save_args)
            print(f"Successfully optimized: {input_path} -> {output_path}")
            sys.exit(0)
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
