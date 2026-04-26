import sys

filename = sys.argv[1]
with open(filename, 'rb') as f:
    content = f.read()
    for i, byte in enumerate(content):
        if byte > 127:
            print(f"Non-ASCII byte {byte} at position {i}")
