#!/usr/bin/env python3
"""
Script to process uncle images:
- Remove white background
- Keep white areas inside black lines
- Make background transparent
"""

import cv2
import numpy as np
from PIL import Image
import os

def process_uncle_image(input_path, output_path):
    """
    Process an uncle image to remove white background while keeping internal white areas
    """
    # Load the image
    img = cv2.imread(input_path)
    if img is None:
        print(f"Error: Could not load image {input_path}")
        return False
    
    # Convert to grayscale for processing
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Create a binary mask where black lines are 0 and white areas are 255
    _, binary = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY)
    
    # Find contours (the black lines)
    contours, hierarchy = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    
    # Create a mask for the final result
    mask = np.zeros(gray.shape, dtype=np.uint8)
    
    # Fill the exterior contours (main shape) and interior holes
    for i, contour in enumerate(contours):
        # If this is an outer contour (hierarchy[0][i][3] == -1)
        if hierarchy[0][i][3] == -1:
            # Fill the contour
            cv2.fillPoly(mask, [contour], 255)
        # If this is an inner contour (hole), we want to keep it white
        else:
            cv2.fillPoly(mask, [contour], 255)
    
    # Alternative approach: Use flood fill from corners to identify background
    flood_mask = np.zeros((gray.shape[0] + 2, gray.shape[1] + 2), dtype=np.uint8)
    background_mask = gray.copy()
    
    # Flood fill from all four corners
    corners = [(0, 0), (0, gray.shape[0]-1), (gray.shape[1]-1, 0), (gray.shape[1]-1, gray.shape[0]-1)]
    for corner in corners:
        if background_mask[corner[1], corner[0]] > 200:  # If corner is white-ish
            cv2.floodFill(background_mask, flood_mask, corner, 0)
    
    # Create final mask: keep everything that's not background
    final_mask = (background_mask > 50).astype(np.uint8) * 255
    
    # Convert original image to RGBA
    img_rgba = cv2.cvtColor(img, cv2.COLOR_BGR2RGBA)
    
    # Apply the mask to the alpha channel
    img_rgba[:, :, 3] = final_mask
    
    # Convert to PIL Image and save
    img_pil = Image.fromarray(cv2.cvtColor(img_rgba, cv2.COLOR_BGRA2RGBA))
    img_pil.save(output_path)
    
    print(f"Processed {input_path} -> {output_path}")
    return True

def main():
    """Main function to process all uncle images"""
    # Input and output directories
    input_dir = "resources/images"
    output_dir = "resources/images/processed"
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # List of uncle images to process
    uncle_images = [
        "uncle1.png",
        "uncle2.png", 
        "uncle3.png",
        "uncle4.png",
        "uncle5.png"
    ]
    
    # Process each image
    for image_name in uncle_images:
        input_path = os.path.join(input_dir, image_name)
        output_path = os.path.join(output_dir, image_name)
        
        if os.path.exists(input_path):
            process_uncle_image(input_path, output_path)
        else:
            print(f"Warning: {input_path} not found")

if __name__ == "__main__":
    main() 