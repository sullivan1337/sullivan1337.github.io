#!/bin/bash

TERMINAL_SIZE=$(python3 get_terminal_size.py)
ROWS=$(echo $TERMINAL_SIZE | cut -d',' -f1)
COLS=$(echo $TERMINAL_SIZE | cut -d',' -f2)

curl "http://localhost:5000/animation?rows=$ROWS&cols=$COLS"
