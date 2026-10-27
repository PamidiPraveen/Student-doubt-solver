"""A small, dependency-free text-similarity engine (TF-IDF + cosine).

It runs entirely inside this process: no text is sent to a third party and
no API key is needed. Corpora here are small (one college), so rebuilding an
index when the data changes is cheap. A hosted or embedding-based engine can
replace it later by implementing the same ``build`` and ``query`` methods.
"""

import math
import re
from collections import Counter

STOPWORDS = frozenset("""
a about above after again all also am an and any are as at be because been
before being below between both but by can could did do does doing down
during each few for from further had has have having he her here hers him his
how i if in into is it its itself just me more most my no nor not now of off
on once only or other our out over own same she should so some such than that
the their them then there these they this those through to too under until up
very was we were what when where which while who whom why will with would you
your yours please help explain
""".split())

_SUFFIXES = ("ingly", "edly", "ing", "ed", "es", "ly", "ions", "ion", "s")


def _stem(word):
    """Crude suffix stripping so integrate/integrating/integration agree."""
    for suffix in _SUFFIXES:
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            word = word[: -len(suffix)]
            break
    if word.endswith("e") and len(word) > 4:
        word = word[:-1]
    return word


def tokenize(text):
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    return [
        _stem(w) for w in words
        if w not in STOPWORDS and (len(w) > 1 or w.isdigit())
    ]


def document_text(title, body):
    """The title counts double: it is the most telling part of a question."""
    return f"{title} {title} {body or ''}"


class TfidfIndex:
    def __init__(self, documents):
        """``documents`` is a list of ``(doc_id, text)`` pairs."""
        self._ids = []
        self._counts = []
        df = Counter()

        for doc_id, text in documents:
            counts = Counter(tokenize(text))
            if not counts:
                continue
            self._ids.append(doc_id)
            self._counts.append(counts)
            df.update(counts.keys())

        n = len(self._ids)
        self._idf = {
            term: math.log((n + 1) / (freq + 1)) + 1.0
            for term, freq in df.items()
        }
        self._vectors = [self._vectorise(c) for c in self._counts]

    def __len__(self):
        return len(self._ids)

    def _vectorise(self, counts):
        vec = {
            term: (1.0 + math.log(count)) * self._idf[term]
            for term, count in counts.items()
            if term in self._idf
        }
        norm = math.sqrt(sum(v * v for v in vec.values()))
        if norm == 0:
            return {}
        return {term: v / norm for term, v in vec.items()}

    def query(self, text, limit=5, min_score=0.0):
        """Return up to ``limit`` ``(doc_id, score)`` pairs, best first."""
        query_vec = self._vectorise(Counter(tokenize(text)))
        if not query_vec:
            return []

        scored = []
        for doc_id, vec in zip(self._ids, self._vectors):
            score = sum(w * vec.get(t, 0.0) for t, w in query_vec.items())
            if score >= min_score and score > 0:
                scored.append((doc_id, score))

        scored.sort(key=lambda pair: pair[1], reverse=True)
        return scored[:limit]
