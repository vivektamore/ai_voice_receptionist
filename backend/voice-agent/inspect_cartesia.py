import sys

try:
    import cartesia
    print("cartesia package:", cartesia)
    # Print where cartesia is imported from
    import os
    print("cartesia file:", cartesia.__file__)
except Exception as e:
    print("cartesia import error:", e)

try:
    import elevenlabs
    print("elevenlabs package:", elevenlabs)
    print("elevenlabs file:", elevenlabs.__file__)
except Exception as e:
    print("elevenlabs import error:", e)
