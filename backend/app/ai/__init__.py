"""AI suggestions.

Nothing in this package writes or edits a faculty answer. Gemini is used for
suggestions when configured; local TF-IDF remains the fallback.
"""

AI_META = {
    "label": "AI suggestion",
    "engine": "local-tfidf",
    "note": (
        "Suggested by local word matching. It is not an answer from faculty "
        "and may be wrong."
    ),
}


def ai_meta(engine, feature, enabled=True):
    note = (
        "Gemini-generated suggestion. Check it yourself; it is not an answer "
        "from faculty."
        if engine == "gemini"
        else AI_META["note"]
    )
    return {
        **AI_META,
        "engine": engine,
        "note": note,
        "enabled": enabled,
        "feature": feature,
    }
