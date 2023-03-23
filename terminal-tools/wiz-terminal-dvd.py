from flask import Flask, Response, request, jsonify
import time
import os
import shutil

app = Flask(__name__)

ASCII_FRAMES = [
    r"""
                                                        @    
                                                       @@@  
                                                        @   
 @@@@@@     @@@      @@@@@@  @@@@   @@@@@@@@@@@@@@@        
  @@@@@@   @@@@@@   @@@@@@   @@@@   @@@@@@@@@@@@@@         
   @@@@@@ @@@@@@@@ @@@@@@    @@@@         @@@@@@           
    @@@@@@@@@@@@@@@@@@@@     @@@@       @@@@@@@            
     @@@@@@@@  @@@@@@@@      @@@@      @@@@@@              
      @@@@@@    @@@@@@       @@@@     @@@@@@               
       @@@@      @@@@        @@@@    @@@@@@@@@@@@@@       
        @          @         @@@@   @@@@@@@@@@@@@@@       
"""
]


def get_terminal_size():
# shutil attempt to get remote terminal size
#    try:
#    columns, rows = shutil.get_terminal_size()
#    return rows - 2, columns - 2  

# tput attempt to get remote terminal size
#    try:
#        rows = int(os.popen('tput lines').read())
#        columns = int(os.popen('tput cols').read())
#        return rows - 2, columns - 2

#   except:

# The below works for staticly setting the terminal size
    columns, rows = 24, 80
    return columns, rows  # Default terminal size with 24 rows and 80 columns


def get_frame_dimensions(frame):
    lines = frame.split('\n')
    height = len(lines)
    width = max(len(line) for line in lines)
    return width, height

@app.route('/terminal_size')
def terminal_size():
    rows, columns = get_terminal_size()
    return jsonify(rows=rows, columns=columns)

@app.route('/get_public_ip')
def get_public_ip():
    client_ip = request.remote_addr
    return f"Your public IP address is: {client_ip}\n"

@app.route('/')
def animation():
    rows = int(request.args.get('rows', 24))
    columns = int(request.args.get('cols', 80))
    def generate_frames():
        clear_screen = "\033[H\033[J"
        rows, columns = get_terminal_size()

        x, y = 0, 0
        dx, dy = 1, 1

        frame_width, frame_height = get_frame_dimensions(ASCII_FRAMES[0])

        colors = ["\033[31m", "\033[32m", "\033[34m", "\033[35m"]  # Red, Green, Blue, Magenta
        reset_color = "\033[0m"

        frame_time = 0.11  # Time between frame changes
        color_time = 0.21  # Time between color changes
        frame_start_time = time.time()
        color_start_time = time.time()

        frame_index = 0
        color_index = 0

        while True:
            current_time = time.time()

            if current_time - frame_start_time >= frame_time:
                frame_start_time = current_time
                frame_index = (frame_index + 1) % len(ASCII_FRAMES)

                x += dx
                y += dy

                if x + frame_width > columns or x < 0:
                    dx *= -1

                if y + frame_height > rows or y < 0:
                    dy *= -1

            if current_time - color_start_time >= color_time:
                color_start_time = current_time
                color_index = (color_index + 1) % len(colors)

            frame = ASCII_FRAMES[frame_index]
            color = colors[color_index]
            lines = frame.split('\n')
            colored_lines = [color + (' ' * x) + line + reset_color for line in lines]
            output_frame = ('\n' * y) + '\n'.join(colored_lines)
            yield (clear_screen + output_frame).encode('utf-8')

            time.sleep(0.01)  # Small sleep to reduce CPU usage

    return Response(generate_frames(), content_type='text/plain; charset=utf-8')

if __name__ == '__main__':
    app.run(debug=False)
