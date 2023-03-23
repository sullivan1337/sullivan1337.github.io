import shutil

def get_local_terminal_size():
    columns, rows = shutil.get_terminal_size()
    return rows - 2, columns - 2

if __name__ == '__main__':
    rows, cols = get_local_terminal_size()
    print(f"{rows},{cols}")
