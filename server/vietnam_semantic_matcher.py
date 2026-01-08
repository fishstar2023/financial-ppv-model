"""
語義問題比對器
使用 OpenAI Embeddings 計算問題之間的語義相似度，自動合併相似問題
"""
import os
from typing import List, Dict, Tuple
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 相似度閾值 - 高於此值視為相同問題
# 0.85 太嚴格（「請概述自己的旅遊習慣」和「目前你的旅遊習慣是什麼」只有 ~0.73）
# 0.72 能捕捉到語義相似但措辭不同的問題
SIMILARITY_THRESHOLD = 0.72


def get_embedding(text: str) -> List[float]:
    """取得文字的 embedding 向量"""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """計算兩個向量的餘弦相似度"""
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = sum(a * a for a in vec1) ** 0.5
    norm2 = sum(b * b for b in vec2) ** 0.5
    if norm1 == 0 or norm2 == 0:
        return 0
    return dot_product / (norm1 * norm2)


def normalize_question_basic(question: str) -> str:
    """基礎文字正規化（移除標點、空白等）"""
    import re
    # 移除引號
    question = re.sub(r'["「『"」』"]', '', question)
    # 移除問號
    question = re.sub(r'[？?]', '', question)
    # 移除多餘空白
    question = re.sub(r'\s+', '', question)
    return question.strip()


def group_similar_questions(
    questions: List[str],
    threshold: float = SIMILARITY_THRESHOLD
) -> Dict[str, List[str]]:
    """
    將語義相似的問題分組

    Args:
        questions: 問題列表
        threshold: 相似度閾值

    Returns:
        {
            "canonical_question": ["similar_question1", "similar_question2", ...]
        }
    """
    if not questions:
        return {}

    # 先做基礎正規化去重
    normalized_map: Dict[str, str] = {}  # normalized -> first original
    unique_questions: List[str] = []

    for q in questions:
        normalized = normalize_question_basic(q)
        if normalized not in normalized_map:
            normalized_map[normalized] = q
            unique_questions.append(q)

    if len(unique_questions) <= 1:
        return {unique_questions[0]: questions} if unique_questions else {}

    print(f"🔍 [Semantic Matcher] Computing embeddings for {len(unique_questions)} unique questions...")

    # 計算所有問題的 embedding
    embeddings: List[List[float]] = []
    for q in unique_questions:
        try:
            emb = get_embedding(q)
            embeddings.append(emb)
        except Exception as e:
            print(f"  ⚠️ Failed to get embedding for: {q[:30]}... - {e}")
            embeddings.append([])

    # 分組相似問題
    groups: Dict[str, List[str]] = {}
    used: set = set()

    for i, q1 in enumerate(unique_questions):
        if i in used or not embeddings[i]:
            continue

        # 建立新群組，以此問題為代表
        group = [q1]
        used.add(i)

        for j, q2 in enumerate(unique_questions):
            if j in used or j <= i or not embeddings[j]:
                continue

            similarity = cosine_similarity(embeddings[i], embeddings[j])
            if similarity >= threshold:
                group.append(q2)
                used.add(j)
                print(f"  ✓ Merged: '{q1[:25]}...' ≈ '{q2[:25]}...' (sim={similarity:.3f})")

        groups[q1] = group

    # 將原始問題（包括基礎正規化後相同的）映射回群組
    final_groups: Dict[str, List[str]] = {}
    for canonical, similar_list in groups.items():
        all_originals = []
        for similar_q in similar_list:
            # 找出所有基礎正規化後等於 similar_q 的原始問題
            similar_normalized = normalize_question_basic(similar_q)
            for orig_q in questions:
                if normalize_question_basic(orig_q) == similar_normalized:
                    if orig_q not in all_originals:
                        all_originals.append(orig_q)
        final_groups[canonical] = all_originals if all_originals else similar_list

    print(f"✓ [Semantic Matcher] Grouped {len(questions)} questions into {len(final_groups)} groups")

    return final_groups


def find_canonical_question(
    question: str,
    existing_questions: List[str],
    threshold: float = SIMILARITY_THRESHOLD
) -> Tuple[str, float]:
    """
    找出與輸入問題最相似的現有問題

    Args:
        question: 要比對的問題
        existing_questions: 現有問題列表
        threshold: 相似度閾值

    Returns:
        (canonical_question, similarity_score)
        如果找不到相似問題，返回原問題和 1.0
    """
    if not existing_questions:
        return question, 1.0

    try:
        query_embedding = get_embedding(question)
    except Exception as e:
        print(f"⚠️ [Semantic Matcher] Failed to get embedding: {e}")
        return question, 1.0

    best_match = question
    best_score = 0.0

    for existing_q in existing_questions:
        try:
            existing_emb = get_embedding(existing_q)
            similarity = cosine_similarity(query_embedding, existing_emb)
            if similarity > best_score:
                best_score = similarity
                best_match = existing_q
        except Exception:
            continue

    if best_score >= threshold:
        return best_match, best_score

    return question, 1.0


# 快取機制 - 避免重複計算 embedding
_embedding_cache: Dict[str, List[float]] = {}


def get_embedding_cached(text: str) -> List[float]:
    """帶快取的 embedding 取得"""
    if text not in _embedding_cache:
        _embedding_cache[text] = get_embedding(text)
    return _embedding_cache[text]


def clear_embedding_cache():
    """清除 embedding 快取"""
    global _embedding_cache
    _embedding_cache = {}


# 測試
if __name__ == "__main__":
    test_questions = [
        "請概述自己的旅遊習慣與型態",
        "目前你的旅遊習慣是什麼",
        "你平常的旅遊習慣跟型態是怎樣",
        "買旅遊險的經驗",
        "有沒有購買旅遊保險的經驗",
        "你買過旅遊險嗎",
    ]

    groups = group_similar_questions(test_questions, threshold=0.8)
    print("\n結果:")
    for canonical, similar in groups.items():
        print(f"  [{canonical[:30]}...]")
        for s in similar:
            print(f"    - {s}")
