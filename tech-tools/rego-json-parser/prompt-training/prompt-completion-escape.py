# python prompt-completion-escape.py <prompt_file_path> <completion_file_path>
import json
import sys

def convert_to_escaped_json(prompt, completion):
    prompt_completion_pair = {
        "prompt": prompt,
        "completion": completion
    }
    escaped_json = json.dumps(prompt_completion_pair, ensure_ascii=False)
    return escaped_json

def read_file(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()
    return content

def main():
    if len(sys.argv) != 3:
        print("Usage: python script.py <prompt_file_path> <completion_file_path>")
        sys.exit(1)

    prompt_file_path = sys.argv[1]
    completion_file_path = sys.argv[2]

    prompt = read_file(prompt_file_path)
    completion = read_file(completion_file_path)

    escaped_json = convert_to_escaped_json(prompt, completion)
    print("Escaped JSON prompt/completion pair:")
    print(escaped_json)

if __name__ == "__main__":
    main()
