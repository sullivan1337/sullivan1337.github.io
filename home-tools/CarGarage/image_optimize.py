# Optimizes image quality and size to be space efficient using these 2 toggles:
# quality=quality, optimize=True

# requires pillow, install with:
# pip install pillow

# run script with:
# python image_optimize.py

import os
from PIL import Image

def optimize_images(folder_path, quality=92):
    # Loop through all files in the folder
    for filename in os.listdir(folder_path):
        # Check if the file is an image
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff')):
            file_path = os.path.join(folder_path, filename)
            
            # Open an image file
            with Image.open(file_path) as img:
                # Save the image with optimized quality
                img.save(file_path, quality=quality, optimize=True)

if __name__ == "__main__":
    folder_path = input("Enter the path to the folder containing images: ")
    # you can use ./ if in the current folder the script is in
    optimize_images(folder_path)
    print("Image optimization completed.")
