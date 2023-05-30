FROM python:3.9-alpine

# Install the requests library
RUN pip install requests

# Copy the script into the image
COPY monitor.py /monitor.py

# Run the script
CMD [ "python", "/monitor.py" ]
