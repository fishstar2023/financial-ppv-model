#!/usr/bin/env python3
"""
PPV 極端案例訪談穩定性測試 v2
測試極端 persona 在訪談時的回答品質與穩定性

測試重點：
1. 極端人格的回答是否符合其設定
2. PPV 欄位 (verbosity, emotion_expression 等) 是否影響回答風格
3. 不同極端人格之間的回答差異性
4. 回答長度是否受 language_style.verbosity 影響
"""

import os
import sys
import json
import re
from pathlib import Path
from collections import Counter

# 添加 server 目錄到路徑
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from vietnam_interview_agent import interview_vietnam_persona
from test_ppv_extreme_cases import (
    create_homogeneous_personas,
    create_polarized_personas,
    create_random_extreme_personas,
    create_perfect_diversity_personas
)
from ppv_extreme_generator import (
    create_ppv_driven_extreme_personas,
    generate_gradient_test,
    generate_single_dimension_extremes,
    generate_multi_dimension_cross_extremes,
    generate_diagonal_extremes,
    KEY_DIMENSIONS
)


# 測試問題集
TEST_QUESTIONS = [
    {
        "question": "請描述一下你上次購買旅遊保險的經驗",
        "sub_questions": ["是什麼讓你決定購買？", "過程中有遇到什麼困難嗎？"]
    },
    {
        "question": "如果你在旅途中遇到緊急醫療狀況，你會怎麼做？",
        "sub_questions": ["你會先聯繫誰？", "你對理賠流程有什麼了解？"]
    },
    {
        "question": "你認為旅遊保險最重要的保障是什麼？為什麼？",
        "sub_questions": []
    }
]


def create_extreme_test_personas():
    """建立用於測試的極端 persona"""

    # 1. 極端高風險尋求者
    high_risk_seeker = {
        "id": "extreme_high_risk_001",
        "lastName": "Nguyễn",
        "gender": "Male",
        "age": 28,
        "occupation": "Startup Founder",
        "timesOfOverseasTravelInsurance": 1,
        "purchasedBrand": [],
        "purchasedChannels": ["online"],
        "personalBackground": "剛創業，喜歡冒險",
        "big5": {
            "openness": 95,
            "conscientiousness": 20,
            "extraversion": 90,
            "agreeableness": 30,
            "neuroticism": 15
        },
        "risk_profile": {
            "overall": 95,
            "financial": 90,
            "ethical": 60,
            "social": 85,
            "health": 80
        },
        "decision_style": {
            "primary": "spontaneous",
            "secondary": "intuitive",
            "risk_seeking": 95,
            "info_processing": "satisficer",
            "social_preference": "independent"
        },
        "time_preference": {
            "discount_rate": 90,
            "planning_horizon": "short_term",
            "present_vs_future": -80
        },
        "regulatory_focus": {
            "promotion": 95,
            "prevention": 15
        },
        "language_style": {
            "formality": 20,
            "directness": 90,
            "emotion_expression": 85,
            "verbosity": 70
        },
        "emotion_profile": {
            "baseline_valence": 80,
            "emotional_range": 85,
            "stress_response": "fight",
            "recovery_speed": 90
        }
    }

    # 2. 極端保守謹慎者
    extreme_conservative = {
        "id": "extreme_conservative_001",
        "lastName": "Trần",
        "gender": "Female",
        "age": 55,
        "occupation": "Accountant",
        "timesOfOverseasTravelInsurance": 12,
        "purchasedBrand": ["Bảo Việt", "PVI"],
        "purchasedChannels": ["agent", "bank"],
        "personalBackground": "非常謹慎，凡事三思",
        "big5": {
            "openness": 15,
            "conscientiousness": 95,
            "extraversion": 20,
            "agreeableness": 75,
            "neuroticism": 85
        },
        "risk_profile": {
            "overall": 5,
            "financial": 5,
            "ethical": 90,
            "social": 10,
            "health": 5
        },
        "decision_style": {
            "primary": "analytical",
            "secondary": "dependent",
            "risk_seeking": 5,
            "info_processing": "maximizer",
            "social_preference": "collaborative"
        },
        "time_preference": {
            "discount_rate": 10,
            "planning_horizon": "long_term",
            "present_vs_future": 90
        },
        "regulatory_focus": {
            "promotion": 10,
            "prevention": 95
        },
        "language_style": {
            "formality": 90,
            "directness": 30,
            "emotion_expression": 25,
            "verbosity": 85
        },
        "emotion_profile": {
            "baseline_valence": 40,
            "emotional_range": 30,
            "stress_response": "freeze",
            "recovery_speed": 25
        }
    }

    # 3. 極端懷疑/負面者
    extreme_skeptic = {
        "id": "extreme_skeptic_001",
        "lastName": "Lê",
        "gender": "Male",
        "age": 42,
        "occupation": "Lawyer",
        "timesOfOverseasTravelInsurance": 5,
        "purchasedBrand": ["Various"],
        "purchasedChannels": ["online"],
        "personalBackground": "曾被保險公司拒賠，非常不信任",
        "big5": {
            "openness": 40,
            "conscientiousness": 80,
            "extraversion": 35,
            "agreeableness": 15,
            "neuroticism": 70
        },
        "risk_profile": {
            "overall": 30,
            "financial": 40,
            "ethical": 85,
            "social": 25,
            "health": 35
        },
        "decision_style": {
            "primary": "analytical",
            "secondary": "avoidant",
            "risk_seeking": 20,
            "info_processing": "maximizer",
            "social_preference": "independent"
        },
        "time_preference": {
            "discount_rate": 35,
            "planning_horizon": "medium_term",
            "present_vs_future": 30
        },
        "regulatory_focus": {
            "promotion": 25,
            "prevention": 85
        },
        "language_style": {
            "formality": 75,
            "directness": 95,
            "emotion_expression": 40,
            "verbosity": 70
        },
        "emotion_profile": {
            "baseline_valence": 30,
            "emotional_range": 60,
            "stress_response": "fight",
            "recovery_speed": 45
        }
    }

    # 4. 極端被動/無所謂者
    extreme_passive = {
        "id": "extreme_passive_001",
        "lastName": "Phạm",
        "gender": "Female",
        "age": 24,
        "occupation": "Student",
        "timesOfOverseasTravelInsurance": 2,
        "purchasedBrand": ["Don't remember"],
        "purchasedChannels": ["travel_agent"],
        "personalBackground": "對保險沒什麼概念，通常家人處理",
        "big5": {
            "openness": 50,
            "conscientiousness": 25,
            "extraversion": 45,
            "agreeableness": 80,
            "neuroticism": 35
        },
        "risk_profile": {
            "overall": 50,
            "financial": 50,
            "ethical": 50,
            "social": 50,
            "health": 50
        },
        "decision_style": {
            "primary": "dependent",
            "secondary": "avoidant",
            "risk_seeking": 45,
            "info_processing": "satisficer",
            "social_preference": "delegator"
        },
        "time_preference": {
            "discount_rate": 60,
            "planning_horizon": "short_term",
            "present_vs_future": -20
        },
        "regulatory_focus": {
            "promotion": 40,
            "prevention": 40
        },
        "language_style": {
            "formality": 35,
            "directness": 40,
            "emotion_expression": 50,
            "verbosity": 30
        },
        "emotion_profile": {
            "baseline_valence": 60,
            "emotional_range": 45,
            "stress_response": "fawn",
            "recovery_speed": 65
        }
    }

    # 5. 極端情緒化/焦慮者
    extreme_anxious = {
        "id": "extreme_anxious_001",
        "lastName": "Hoàng",
        "gender": "Female",
        "age": 38,
        "occupation": "Teacher",
        "timesOfOverseasTravelInsurance": 8,
        "purchasedBrand": ["Bảo Việt", "Manulife"],
        "purchasedChannels": ["agent", "bank"],
        "personalBackground": "對旅行充滿焦慮，總是擔心會出事",
        "big5": {
            "openness": 55,
            "conscientiousness": 70,
            "extraversion": 40,
            "agreeableness": 70,
            "neuroticism": 95
        },
        "risk_profile": {
            "overall": 15,
            "financial": 20,
            "ethical": 75,
            "social": 30,
            "health": 10
        },
        "decision_style": {
            "primary": "dependent",
            "secondary": "avoidant",
            "risk_seeking": 10,
            "info_processing": "maximizer",
            "social_preference": "collaborative"
        },
        "time_preference": {
            "discount_rate": 25,
            "planning_horizon": "long_term",
            "present_vs_future": 60
        },
        "regulatory_focus": {
            "promotion": 20,
            "prevention": 90
        },
        "language_style": {
            "formality": 55,
            "directness": 35,
            "emotion_expression": 95,
            "verbosity": 90
        },
        "emotion_profile": {
            "baseline_valence": 35,
            "emotional_range": 95,
            "stress_response": "flight",
            "recovery_speed": 20
        }
    }

    return [
        ("極端高風險尋求者", high_risk_seeker),
        ("極端保守謹慎者", extreme_conservative),
        ("極端懷疑/負面者", extreme_skeptic),
        ("極端被動/無所謂者", extreme_passive),
        ("極端情緒化/焦慮者", extreme_anxious),
    ]


def analyze_response(response: str, persona_type: str, persona: dict = None) -> dict:
    """分析回答是否符合人格特徵"""

    # 基本統計
    char_count = len(response)
    # 用標點符號分割來估算句子數
    sentences = re.split(r'[。！？\n]', response)
    sentence_count = len([s for s in sentences if s.strip()])

    # 情緒詞分析
    emotion_words = ["擔心", "害怕", "焦慮", "開心", "興奮", "生氣", "煩", "頭痛", "緊張", "不安",
                     "放心", "安心", "高興", "失望", "驚訝", "哎呀", "天啊", "唉"]
    emotion_count = sum(1 for w in emotion_words if w in response)

    # 負面詞彙
    negative_words = ["不信任", "懷疑", "失望", "拒絕", "被騙", "浪費", "麻煩", "頭疼", "生氣",
                      "不好", "糟糕", "差", "爛", "騙", "坑"]
    negative_count = sum(1 for w in negative_words if w in response)

    # 不確定性詞彙
    uncertainty_words = ["不確定", "不知道", "可能", "也許", "應該", "大概", "好像", "似乎"]
    uncertainty_count = sum(1 for w in uncertainty_words if w in response)

    # 自信詞彙
    confidence_words = ["一定", "肯定", "必須", "當然", "絕對", "確定", "必然"]
    confidence_count = sum(1 for w in confidence_words if w in response)

    # 口語填充詞
    filler_words = ["就是", "然後", "對啊", "反正", "怎麼說呢", "老實說", "說實話", "坦白講"]
    filler_count = sum(1 for w in filler_words if w in response)

    # 開頭詞分析
    first_word = response[:10] if response else ""
    banned_openers = ["其實", "嗯", "哦", "喔", "欸"]
    uses_banned_opener = any(response.startswith(w) for w in banned_openers)

    analysis = {
        "length": char_count,
        "sentence_count": sentence_count,
        "avg_sentence_length": round(char_count / max(sentence_count, 1), 1),
        "emotion_count": emotion_count,
        "negative_count": negative_count,
        "uncertainty_count": uncertainty_count,
        "confidence_count": confidence_count,
        "filler_count": filler_count,
        "uses_banned_opener": uses_banned_opener,
        "first_10_chars": first_word,
        "has_emotion_words": emotion_count > 0,
        "has_negative_sentiment": negative_count > 0,
        "has_uncertainty": uncertainty_count > 0,
        "has_confidence": confidence_count > 0,
        "persona_type": persona_type
    }

    # 如果有 persona，檢查 PPV 一致性
    if persona:
        ppv_consistency = check_ppv_consistency(response, persona, analysis)
        analysis["ppv_consistency"] = ppv_consistency

    return analysis


def check_ppv_consistency(response: str, persona: dict, analysis: dict) -> dict:
    """檢查回答是否與 PPV 設定一致"""
    consistency = {
        "checks": [],
        "passed": 0,
        "failed": 0,
        "score": 0.0
    }

    # 1. Verbosity 檢查 - 高 verbosity 應該產生較長回答
    verbosity = persona.get("language_style", {}).get("verbosity", 50)
    expected_length = "long" if verbosity > 66 else ("short" if verbosity < 34 else "medium")
    actual_length = "long" if analysis["length"] > 350 else ("short" if analysis["length"] < 200 else "medium")

    if expected_length == actual_length:
        consistency["checks"].append(f"✅ Verbosity({verbosity}): 預期{expected_length}，實際{actual_length}")
        consistency["passed"] += 1
    else:
        consistency["checks"].append(f"⚠️ Verbosity({verbosity}): 預期{expected_length}，實際{actual_length}")
        consistency["failed"] += 1

    # 2. Emotion Expression 檢查
    emotion_expr = persona.get("language_style", {}).get("emotion_expression", 50)
    if emotion_expr > 66:
        if analysis["emotion_count"] >= 2:
            consistency["checks"].append(f"✅ Emotion({emotion_expr}): 有{analysis['emotion_count']}個情緒詞")
            consistency["passed"] += 1
        else:
            consistency["checks"].append(f"⚠️ Emotion({emotion_expr}): 只有{analysis['emotion_count']}個情緒詞")
            consistency["failed"] += 1
    elif emotion_expr < 34:
        if analysis["emotion_count"] <= 1:
            consistency["checks"].append(f"✅ Emotion({emotion_expr}): 低情緒表達({analysis['emotion_count']}詞)")
            consistency["passed"] += 1
        else:
            consistency["checks"].append(f"⚠️ Emotion({emotion_expr}): 情緒詞過多({analysis['emotion_count']})")
            consistency["failed"] += 1

    # 3. Neuroticism 檢查 - 高神經質應該有更多不確定性
    neuroticism = persona.get("big5", {}).get("neuroticism", 50)
    if neuroticism > 66:
        if analysis["uncertainty_count"] >= 1 or analysis["emotion_count"] >= 2:
            consistency["checks"].append(f"✅ Neuroticism({neuroticism}): 有焦慮/不確定表達")
            consistency["passed"] += 1
        else:
            consistency["checks"].append(f"⚠️ Neuroticism({neuroticism}): 缺少焦慮/不確定表達")
            consistency["failed"] += 1

    # 4. Risk Profile 檢查 - 低風險承受應該較謹慎
    risk_overall = persona.get("risk_profile", {}).get("overall", 50)
    if risk_overall < 34:
        cautious_words = ["小心", "注意", "擔心", "怕", "安全", "確認", "確保"]
        has_caution = any(w in response for w in cautious_words)
        if has_caution:
            consistency["checks"].append(f"✅ Risk({risk_overall}): 有謹慎用語")
            consistency["passed"] += 1
        else:
            consistency["checks"].append(f"⚠️ Risk({risk_overall}): 缺少謹慎用語")
            consistency["failed"] += 1
    elif risk_overall > 66:
        bold_words = ["衝", "試試", "冒險", "不怕", "無所謂", "隨便"]
        has_bold = any(w in response for w in bold_words)
        if has_bold or analysis["confidence_count"] >= 1:
            consistency["checks"].append(f"✅ Risk({risk_overall}): 有冒險/自信表達")
            consistency["passed"] += 1
        else:
            consistency["checks"].append(f"⚠️ Risk({risk_overall}): 缺少冒險/自信表達")
            consistency["failed"] += 1

    # 計算一致性分數
    total = consistency["passed"] + consistency["failed"]
    consistency["score"] = round(consistency["passed"] / max(total, 1), 2)

    return consistency


def run_ppv_driven_test(
    test_type: str = "verbosity_gradient",
    num_runs: int = 1,
    question_index: int = 0
):
    """
    執行 PPV 數值驅動的極端測試

    Args:
        test_type: 測試類型
            - "verbosity_gradient": verbosity 0→100 梯度測試
            - "single_dimension": 單一維度極端測試
            - "cross_dimension": 多維度交叉測試
            - "diagonal": 對角極端測試
            - "all_key": 所有關鍵維度極端測試
        num_runs: 每個 persona 測試次數
        question_index: 使用哪個問題（0-2）
    """
    print("=" * 70)
    print(f"PPV 數值驅動極端測試 - 類型: {test_type}")
    print("=" * 70)

    # 檢查 API Key
    if not os.getenv("OPENAI_API_KEY"):
        print("\n❌ 錯誤: 未設定 OPENAI_API_KEY")
        return None

    # 根據測試類型生成 personas
    if test_type == "verbosity_gradient":
        test_personas = generate_gradient_test(
            ("language_style", "verbosity"), steps=10
        )
    elif test_type == "single_dimension":
        # 測試 verbosity 的單一維度極端
        test_personas = generate_single_dimension_extremes(
            ("language_style", "verbosity"),
            extreme_values=[5, 25, 50, 75, 95],
            include_boundaries=True
        )
    elif test_type == "cross_dimension":
        test_personas = generate_multi_dimension_cross_extremes(
            [("language_style", "verbosity"), ("language_style", "emotion_expression")],
            values=[10, 50, 90]
        )
    elif test_type == "diagonal":
        test_personas = generate_diagonal_extremes()
    elif test_type == "all_key":
        test_personas = create_ppv_driven_extreme_personas()
    else:
        print(f"❌ 未知測試類型: {test_type}")
        return None

    print(f"\n測試 Personas 數量: {len(test_personas)}")
    print(f"每個 Persona 測試次數: {num_runs}")
    print(f"使用問題: {TEST_QUESTIONS[question_index]['question'][:40]}...")

    results = []
    response_lengths = []

    for persona_name, persona in test_personas:
        print(f"\n{'─' * 60}")
        print(f"測試: {persona_name}")

        # 顯示關鍵 PPV 值
        ls = persona.get("language_style", {})
        print(f"  Language Style: V={ls.get('verbosity', 'N/A')}, "
              f"F={ls.get('formality', 'N/A')}, "
              f"E={ls.get('emotion_expression', 'N/A')}")

        q_data = TEST_QUESTIONS[question_index]

        for run in range(num_runs):
            try:
                response = interview_vietnam_persona(
                    persona=persona,
                    question=q_data["question"],
                    sub_questions=q_data.get("sub_questions", [])
                )

                analysis = analyze_response(response, persona_name, persona)
                response_lengths.append(analysis["length"])

                results.append({
                    "persona_name": persona_name,
                    "persona_id": persona["id"],
                    "ppv": {
                        "verbosity": ls.get("verbosity"),
                        "formality": ls.get("formality"),
                        "emotion_expression": ls.get("emotion_expression"),
                    },
                    "run": run + 1,
                    "response": response,
                    "analysis": analysis
                })

                print(f"  Run {run + 1}: {analysis['length']} chars")

            except Exception as e:
                print(f"  ❌ Run {run + 1} 錯誤: {str(e)}")

    # 計算統計
    if response_lengths:
        import statistics
        mean_len = statistics.mean(response_lengths)
        std_len = statistics.stdev(response_lengths) if len(response_lengths) > 1 else 0
        cv = (std_len / mean_len * 100) if mean_len > 0 else 0
        min_len = min(response_lengths)
        max_len = max(response_lengths)

        print("\n" + "=" * 70)
        print("測試結果統計")
        print("=" * 70)
        print(f"  • 回答數: {len(response_lengths)}")
        print(f"  • 平均長度: {mean_len:.0f} chars")
        print(f"  • 標準差: {std_len:.0f} chars")
        print(f"  • 變異係數: {cv:.1f}%")
        print(f"  • 最小/最大: {min_len}/{max_len} chars")
        print(f"  • 範圍比: {max_len/max(min_len, 1):.1f}x")

        if cv > 30:
            print("  ✅ 變異係數 > 30%，PPV 對回答長度有顯著影響")
        elif cv > 20:
            print("  ⚠️ 變異係數 20-30%，PPV 有中等影響")
        else:
            print("  ❌ 變異係數 < 20%，PPV 影響可能不足")

    return results


def run_diversity_analysis_test():
    """
    全面測試 PPV 對回答多樣性的影響

    分析維度：
    1. 回答長度多樣性 (CV)
    2. 開頭詞多樣性 (unique openers)
    3. 情緒表達多樣性
    4. PPV 一致性分數
    5. 極端程度表現
    """
    print("=" * 70)
    print("PPV 多樣性與極端程度全面分析")
    print("=" * 70)

    if not os.getenv("OPENAI_API_KEY"):
        print("\n❌ 錯誤: 未設定 OPENAI_API_KEY")
        return None

    # 使用對角極端 personas（最能展示差異）
    test_personas = generate_diagonal_extremes()

    q_data = TEST_QUESTIONS[0]
    results = []

    for persona_name, persona in test_personas:
        ls = persona.get("language_style", {})
        big5 = persona.get("big5", {})
        risk = persona.get("risk_profile", {})

        print(f"\n{'─' * 60}")
        print(f"測試: {persona_name}")
        print(f"  V={ls.get('verbosity', 'N/A')}, F={ls.get('formality', 'N/A')}, "
              f"E={ls.get('emotion_expression', 'N/A')}")
        print(f"  Neuroticism={big5.get('neuroticism', 'N/A')}, Risk={risk.get('overall', 'N/A')}")

        try:
            response = interview_vietnam_persona(
                persona=persona,
                question=q_data["question"],
                sub_questions=q_data.get("sub_questions", [])
            )

            analysis = analyze_response(response, persona_name, persona)

            results.append({
                "persona_name": persona_name,
                "ppv": {
                    "verbosity": ls.get("verbosity"),
                    "formality": ls.get("formality"),
                    "emotion_expression": ls.get("emotion_expression"),
                    "neuroticism": big5.get("neuroticism"),
                    "risk_overall": risk.get("overall"),
                },
                "response": response,
                "analysis": analysis
            })

            # 顯示分析結果
            print(f"\n  📊 回答分析:")
            print(f"     長度: {analysis['length']} chars, {analysis['sentence_count']} 句")
            print(f"     情緒詞: {analysis['emotion_count']}, 負面詞: {analysis['negative_count']}")
            print(f"     不確定詞: {analysis['uncertainty_count']}, 自信詞: {analysis['confidence_count']}")
            print(f"     開頭: \"{analysis['first_10_chars']}...\"")

            if "ppv_consistency" in analysis:
                ppv_con = analysis["ppv_consistency"]
                print(f"\n  🎯 PPV 一致性: {ppv_con['score']:.0%} ({ppv_con['passed']}/{ppv_con['passed']+ppv_con['failed']})")
                for check in ppv_con["checks"]:
                    print(f"     {check}")

        except Exception as e:
            print(f"  ❌ 錯誤: {str(e)}")

    # 計算整體統計
    if len(results) >= 2:
        import statistics

        print("\n" + "=" * 70)
        print("多樣性分析總結")
        print("=" * 70)

        # 1. 長度多樣性
        lengths = [r["analysis"]["length"] for r in results]
        mean_len = statistics.mean(lengths)
        std_len = statistics.stdev(lengths) if len(lengths) > 1 else 0
        cv_len = (std_len / mean_len * 100) if mean_len > 0 else 0

        print(f"\n📏 回答長度多樣性:")
        print(f"   範圍: {min(lengths)} - {max(lengths)} chars")
        print(f"   平均: {mean_len:.0f}, 標準差: {std_len:.0f}")
        print(f"   變異係數: {cv_len:.1f}%")
        if cv_len > 30:
            print(f"   ✅ 長度多樣性良好")
        else:
            print(f"   ⚠️ 長度多樣性不足")

        # 2. 開頭詞多樣性
        openers = [r["analysis"]["first_10_chars"] for r in results]
        unique_openers = len(set(openers))
        opener_diversity = unique_openers / len(openers) * 100

        print(f"\n🔤 開頭詞多樣性:")
        print(f"   唯一開頭: {unique_openers}/{len(openers)}")
        print(f"   多樣性: {opener_diversity:.0f}%")
        for i, opener in enumerate(openers):
            print(f"   {i+1}. \"{opener}...\"")
        if opener_diversity >= 75:
            print(f"   ✅ 開頭詞多樣性良好")
        else:
            print(f"   ⚠️ 開頭詞重複過多")

        # 3. 情緒表達多樣性
        emotion_counts = [r["analysis"]["emotion_count"] for r in results]
        emotion_range = max(emotion_counts) - min(emotion_counts)

        print(f"\n😊 情緒表達多樣性:")
        print(f"   情緒詞數範圍: {min(emotion_counts)} - {max(emotion_counts)}")
        print(f"   範圍差: {emotion_range}")
        for r in results:
            name = r["persona_name"].replace("對角極端: ", "")
            emo = r["ppv"]["emotion_expression"]
            count = r["analysis"]["emotion_count"]
            print(f"   {name}: E={emo} → {count} 個情緒詞")

        # 4. PPV 一致性總分
        consistency_scores = [
            r["analysis"].get("ppv_consistency", {}).get("score", 0)
            for r in results
        ]
        avg_consistency = statistics.mean(consistency_scores) if consistency_scores else 0

        print(f"\n🎯 PPV 一致性總分:")
        print(f"   平均一致性: {avg_consistency:.0%}")
        for r in results:
            name = r["persona_name"].replace("對角極端: ", "")
            score = r["analysis"].get("ppv_consistency", {}).get("score", 0)
            print(f"   {name}: {score:.0%}")

        # 5. 極端程度分析
        print(f"\n⚡ 極端程度分析:")

        # 找出全高和全低的結果
        all_high = next((r for r in results if "全高" in r["persona_name"]), None)
        all_low = next((r for r in results if "全低" in r["persona_name"]), None)

        if all_high and all_low:
            len_diff = all_high["analysis"]["length"] - all_low["analysis"]["length"]
            emo_diff = all_high["analysis"]["emotion_count"] - all_low["analysis"]["emotion_count"]

            print(f"   全高 vs 全低:")
            print(f"   • 長度差異: {len_diff:+d} chars ({all_high['analysis']['length']} vs {all_low['analysis']['length']})")
            print(f"   • 情緒詞差異: {emo_diff:+d} ({all_high['analysis']['emotion_count']} vs {all_low['analysis']['emotion_count']})")

            if len_diff > 200:
                print(f"   ✅ 極端 verbosity 有顯著效果")
            else:
                print(f"   ⚠️ 極端 verbosity 效果不明顯")

        # 整體評分
        print(f"\n{'=' * 70}")
        print("整體評估")
        print("=" * 70)

        score = 0
        if cv_len > 30: score += 25
        if opener_diversity >= 75: score += 25
        if emotion_range >= 2: score += 25
        if avg_consistency >= 0.5: score += 25

        print(f"\n🏆 多樣性總分: {score}/100")

        if score >= 75:
            print("   ✅ PPV 系統運作良好，多樣性表現優秀")
        elif score >= 50:
            print("   ⚠️ PPV 系統有效，但部分維度需要改進")
        else:
            print("   ❌ PPV 系統需要調整，多樣性不足")

    return results


def run_verbosity_correlation_test():
    """
    專門測試 verbosity 值與回答長度的相關性

    預期：verbosity 越高，回答越長（正相關）
    """
    print("=" * 70)
    print("Verbosity 相關性測試")
    print("=" * 70)

    if not os.getenv("OPENAI_API_KEY"):
        print("\n❌ 錯誤: 未設定 OPENAI_API_KEY")
        return None

    # 生成 verbosity 梯度 (0, 10, 20, ..., 100)
    test_personas = generate_gradient_test(
        ("language_style", "verbosity"), steps=10
    )

    q_data = TEST_QUESTIONS[0]
    data_points = []

    for persona_name, persona in test_personas:
        verbosity = persona.get("language_style", {}).get("verbosity", 50)
        print(f"\n測試 verbosity={verbosity}...")

        try:
            response = interview_vietnam_persona(
                persona=persona,
                question=q_data["question"],
                sub_questions=q_data.get("sub_questions", [])
            )

            char_count = len(response)
            data_points.append((verbosity, char_count))
            print(f"  回答長度: {char_count} chars")

        except Exception as e:
            print(f"  ❌ 錯誤: {str(e)}")

    # 計算相關係數
    if len(data_points) >= 3:
        import statistics

        verbosities = [d[0] for d in data_points]
        lengths = [d[1] for d in data_points]

        # 計算 Pearson 相關係數
        mean_v = statistics.mean(verbosities)
        mean_l = statistics.mean(lengths)
        std_v = statistics.stdev(verbosities)
        std_l = statistics.stdev(lengths) if len(lengths) > 1 else 0

        if std_v > 0 and std_l > 0:
            covariance = sum((v - mean_v) * (l - mean_l)
                           for v, l in data_points) / (len(data_points) - 1)
            correlation = covariance / (std_v * std_l)
        else:
            correlation = 0

        print("\n" + "=" * 70)
        print("相關性分析結果")
        print("=" * 70)
        print(f"  • 數據點數: {len(data_points)}")
        print(f"  • Verbosity 範圍: {min(verbosities)} - {max(verbosities)}")
        print(f"  • 長度範圍: {min(lengths)} - {max(lengths)} chars")
        print(f"  • Pearson 相關係數: {correlation:.3f}")

        if correlation > 0.7:
            print("  ✅ 強正相關：verbosity 有效控制回答長度")
        elif correlation > 0.4:
            print("  ⚠️ 中等正相關：verbosity 有一定影響")
        elif correlation > 0:
            print("  ❌ 弱正相關：verbosity 影響不明顯")
        else:
            print("  ❌ 無相關或負相關：verbosity 控制失效")

        # 顯示數據點
        print("\n數據點:")
        print("  Verbosity | Length")
        print("  " + "-" * 20)
        for v, l in sorted(data_points):
            bar = "█" * (l // 50)
            print(f"  {v:>8} | {l:>5} {bar}")

    return data_points


def run_interview_stability_test(num_runs: int = 2):
    """執行訪談穩定性測試（原始版本，使用手動定義的極端 personas）"""
    print("=" * 70)
    print("PPV 極端案例訪談穩定性測試")
    print("=" * 70)

    # 檢查 API Key
    if not os.getenv("OPENAI_API_KEY"):
        print("\n❌ 錯誤: 未設定 OPENAI_API_KEY")
        print("請在 .env 檔案中設定 OPENAI_API_KEY")
        return None

    test_personas = create_extreme_test_personas()
    results = []

    for persona_name, persona in test_personas:
        print(f"\n{'─' * 70}")
        print(f"測試 Persona: {persona_name}")
        print(f"ID: {persona['id']}")
        print(f"Big5: O={persona['big5']['openness']}, C={persona['big5']['conscientiousness']}, "
              f"E={persona['big5']['extraversion']}, A={persona['big5']['agreeableness']}, N={persona['big5']['neuroticism']}")
        print(f"風險承受: {persona['risk_profile']['overall']}, 決策風格: {persona['decision_style']['primary']}")
        print(f"{'─' * 70}")

        persona_results = {
            "persona_name": persona_name,
            "persona_id": persona["id"],
            "responses": []
        }

        for q_idx, q_data in enumerate(TEST_QUESTIONS):
            print(f"\n📝 問題 {q_idx + 1}: {q_data['question'][:50]}...")

            for run in range(num_runs):
                try:
                    response = interview_vietnam_persona(
                        persona=persona,
                        question=q_data["question"],
                        sub_questions=q_data.get("sub_questions", [])
                    )

                    analysis = analyze_response(response, persona_name)

                    persona_results["responses"].append({
                        "question_idx": q_idx,
                        "run": run + 1,
                        "question": q_data["question"],
                        "response": response,
                        "analysis": analysis
                    })

                    # 顯示回答摘要
                    print(f"\n   Run {run + 1}:")
                    print(f"   長度: {analysis['length']} chars")
                    preview = response[:200].replace('\n', ' ')
                    print(f"   預覽: {preview}...")

                except Exception as e:
                    print(f"\n   ❌ Run {run + 1} 錯誤: {str(e)}")
                    persona_results["responses"].append({
                        "question_idx": q_idx,
                        "run": run + 1,
                        "error": str(e)
                    })

        results.append(persona_results)

    # 生成摘要報告
    print("\n" + "=" * 70)
    print("測試結果摘要")
    print("=" * 70)

    for persona_result in results:
        print(f"\n{persona_result['persona_name']}:")

        successful_responses = [r for r in persona_result["responses"] if "response" in r]
        if successful_responses:
            avg_length = sum(r["analysis"]["length"] for r in successful_responses) / len(successful_responses)
            emotion_rate = sum(1 for r in successful_responses if r["analysis"]["has_emotion_words"]) / len(successful_responses)
            negative_rate = sum(1 for r in successful_responses if r["analysis"]["has_negative_sentiment"]) / len(successful_responses)

            print(f"   • 成功回答: {len(successful_responses)}/{len(persona_result['responses'])}")
            print(f"   • 平均長度: {avg_length:.0f} chars")
            print(f"   • 情緒表達率: {emotion_rate:.1%}")
            print(f"   • 負面情緒率: {negative_rate:.1%}")

            # 顯示一個完整回答示例
            if successful_responses:
                example = successful_responses[0]
                print(f"\n   📄 回答示例 (問題 1):")
                print(f"   {'─' * 50}")
                # 格式化顯示
                lines = example["response"].split('\n')
                for line in lines[:10]:  # 只顯示前 10 行
                    print(f"   {line}")
                if len(lines) > 10:
                    print(f"   ... (還有 {len(lines) - 10} 行)")

    return results


def compare_persona_responses(results: list):
    """比較不同 persona 對相同問題的回答差異"""
    if not results:
        return

    print("\n" + "=" * 70)
    print("跨 Persona 回答比較")
    print("=" * 70)

    # 取每個 persona 對第一個問題的第一次回答
    first_question_responses = []
    for persona_result in results:
        for r in persona_result["responses"]:
            if r.get("question_idx") == 0 and r.get("run") == 1 and "response" in r:
                first_question_responses.append({
                    "persona": persona_result["persona_name"],
                    "response": r["response"],
                    "analysis": r["analysis"]
                })
                break

    if len(first_question_responses) < 2:
        print("沒有足夠的回答進行比較")
        return

    print(f"\n對同一問題的回答差異分析 (問題 1):")
    print(f"{'─' * 70}")

    for resp in first_question_responses:
        print(f"\n【{resp['persona']}】")
        print(f"   長度: {resp['analysis']['length']} chars")
        print(f"   情緒詞: {'✓' if resp['analysis']['has_emotion_words'] else '✗'}")
        print(f"   負面情緒: {'✓' if resp['analysis']['has_negative_sentiment'] else '✗'}")
        print(f"   不確定性: {'✓' if resp['analysis']['has_uncertainty'] else '✗'}")
        print(f"   自信表達: {'✓' if resp['analysis']['has_confidence'] else '✗'}")

    # 計算回答長度的變異係數
    lengths = [r["analysis"]["length"] for r in first_question_responses]
    if lengths:
        import statistics
        mean_len = statistics.mean(lengths)
        std_len = statistics.stdev(lengths) if len(lengths) > 1 else 0
        cv = (std_len / mean_len * 100) if mean_len > 0 else 0

        print(f"\n📊 回答長度統計:")
        print(f"   • 平均: {mean_len:.0f} chars")
        print(f"   • 標準差: {std_len:.0f} chars")
        print(f"   • 變異係數: {cv:.1f}%")

        if cv > 30:
            print(f"   ✅ 變異係數 > 30%，表示不同 persona 有明顯的回答風格差異")
        else:
            print(f"   ⚠️ 變異係數較低，不同 persona 的回答風格可能過於相似")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="PPV 極端案例訪談測試")
    parser.add_argument(
        "--mode", "-m",
        choices=["original", "ppv_driven", "verbosity_gradient", "cross", "diagonal", "correlation", "diversity"],
        default="ppv_driven",
        help="""測試模式:
            original: 原始手動定義的極端 personas
            ppv_driven: PPV 數值驅動的極端測試
            verbosity_gradient: verbosity 梯度測試 (0→100)
            cross: 多維度交叉測試
            diagonal: 對角極端測試
            correlation: verbosity 相關性分析
            diversity: 多樣性與極端程度全面分析"""
    )
    parser.add_argument(
        "--runs", "-r",
        type=int,
        default=1,
        help="每個 persona 測試次數（預設 1）"
    )

    args = parser.parse_args()

    print(f"\n選擇的測試模式: {args.mode}")
    print(f"每個 persona 測試次數: {args.runs}\n")

    if args.mode == "original":
        results = run_interview_stability_test(num_runs=args.runs)
        if results:
            compare_persona_responses(results)

    elif args.mode == "ppv_driven":
        results = run_ppv_driven_test(
            test_type="all_key",
            num_runs=args.runs
        )

    elif args.mode == "verbosity_gradient":
        results = run_ppv_driven_test(
            test_type="verbosity_gradient",
            num_runs=args.runs
        )

    elif args.mode == "cross":
        results = run_ppv_driven_test(
            test_type="cross_dimension",
            num_runs=args.runs
        )

    elif args.mode == "diagonal":
        results = run_ppv_driven_test(
            test_type="diagonal",
            num_runs=args.runs
        )

    elif args.mode == "correlation":
        run_verbosity_correlation_test()

    elif args.mode == "diversity":
        run_diversity_analysis_test()
