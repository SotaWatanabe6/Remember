import random
from assembly_pipeline import transcribe_assemblyai

def transcribe(path):
    return "assemblyai", transcribe_assemblyai(path)
