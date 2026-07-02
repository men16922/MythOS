import os
import subprocess


def run_cmd(cmd):
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running command: {result.stderr}")
        raise RuntimeError(f"Command failed: {result.stderr}")
    return result.stdout

def main():
    source_file = "docs/cbt/Mythos_Teaser.mov"
    output_file = "docs/cbt/Mythos_Teaser_Edited.mp4"
    
    # Define segments (start_time, end_time) in seconds
    segments = [
        ("00:00:00", "00:00:15"),  # Segment 1: Boot intro
        ("00:00:15", "00:00:45"),  # Segment 2: Awakening & Narrative Choice
        ("00:00:45", "00:01:15"),  # Segment 3: Se-rin appearance & Operation Map
        ("00:02:30", "00:02:45"),  # Segment 4: Data Incinerator & Epiphany popup
        ("00:04:15", "00:04:45"),  # Segment 5: Tactical Combat & Drone takedown
        ("00:05:30", "00:06:00"),  # Segment 6: Boss Confrontation & Final Battle
    ]
    
    temp_files = []
    
    try:
        # Extract segments
        for i, (start, end) in enumerate(segments):
            temp_name = f"temp_seg_{i}.mp4"
            temp_files.append(temp_name)
            
            # Using hardware accelerated encoder h264_videotoolbox for macOS
            cmd = [
                "ffmpeg", "-y",
                "-ss", start,
                "-to", end,
                "-i", source_file,
                "-c:v", "h264_videotoolbox",
                "-b:v", "4000k",
                "-c:a", "aac",
                "-b:a", "128k",
                temp_name
            ]
            run_cmd(cmd)
            print(f"Segment {i} extracted: {start} -> {end}")
            
        # Write concat list
        with open("concat_list.txt", "w") as f:
            for f_name in temp_files:
                f.write(f"file '{f_name}'\n")
                
        # Concatenate segments
        cmd_concat = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", "concat_list.txt",
            "-c", "copy",
            output_file
        ]
        run_cmd(cmd_concat)
        print(f"Video successfully edited and saved to: {output_file}")
        
    finally:
        # Clean up temp files
        for f_name in temp_files:
            if os.path.exists(f_name):
                os.remove(f_name)
        if os.path.exists("concat_list.txt"):
            os.remove("concat_list.txt")

if __name__ == "__main__":
    main()
