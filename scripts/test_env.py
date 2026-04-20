import sys
sys.stdout.write('start\n')
sys.stdout.flush()
try:
    import openpyxl
    sys.stdout.write(f'openpyxl: {openpyxl.__version__}\n')
    sys.stdout.flush()
except Exception as e:
    sys.stdout.write(f'openpyxl ERR: {e}\n')
    sys.stdout.flush()
try:
    import pandas
    sys.stdout.write(f'pandas: {pandas.__version__}\n')
    sys.stdout.flush()
except Exception as e:
    sys.stdout.write(f'pandas ERR: {e}\n')
    sys.stdout.flush()
try:
    import PIL
    sys.stdout.write(f'pillow: {PIL.__version__}\n')
    sys.stdout.flush()
except Exception as e:
    sys.stdout.write(f'pillow ERR: {e}\n')
    sys.stdout.flush()
sys.stdout.write('done\n')
