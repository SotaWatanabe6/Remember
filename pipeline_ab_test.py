import random
from whisper_pipeline import transcribe_whisper
from assembly_pipeline import transcribe_assemblyai

def transcribe(path):

    choice = random.choice(["whisper", "assemblyai"])

    if choice == "whisper":
        return "whisper", transcribe_whisper(path)

    return "assemblyai", transcribe_assemblyai(path)
