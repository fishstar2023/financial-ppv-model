#!/usr/bin/env python3
"""
PPV 數值驅動的極端測試生成器

基於 PPV 維度數值自動生成極端案例，用於測試：
1. 單一維度極端值的影響（固定其他維度，只變動一個）
2. 多維度交叉極端（測試維度間的交互效果）
3. 邊界敏感度（測試閾值附近的行為）
4. 對角極端（所有維度同時極端化）

設計原則：
- 不再手動定義每個 persona，而是基於 PPV 結構自動生成
- 可以指定要測試的維度和極端值
- 支援連續縮放和離散邊界測試
"""

import random
from typing import List, Dict, Tuple, Optional
from copy import deepcopy


# ===== PPV 結構定義 =====

PPV_STRUCTURE = {
    "big5": {
        "type": "continuous",
        "fields": ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"],
        "range": (0, 100),
        "default": 50
    },
    "risk_profile": {
        "type": "continuous",
        "fields": ["overall", "financial", "ethical", "social", "health"],
        "range": (0, 100),
        "default": 50
    },
    "language_style": {
        "type": "continuous",
        "fields": ["verbosity", "formality", "directness", "emotion_expression"],
        "range": (0, 100),
        "default": 50
    },
    "decision_style": {
        "type": "mixed",
        "continuous_fields": ["risk_seeking"],
        "categorical_fields": {
            "primary": ["analytical", "intuitive", "dependent", "avoidant", "spontaneous"],
            "secondary": ["analytical", "intuitive", "dependent", "avoidant", "spontaneous"],
            "info_processing": ["maximizer", "satisficer", "optimizer"],
            "social_preference": ["independent", "collaborative", "delegator"]
        },
        "range": (0, 100),
        "default": 50
    },
    "time_preference": {
        "type": "mixed",
        "continuous_fields": ["discount_rate", "present_vs_future"],
        "categorical_fields": {
            "planning_horizon": ["short_term", "medium_term", "long_term"]
        },
        "ranges": {
            "discount_rate": (0, 100),
            "present_vs_future": (-100, 100)
        },
        "defaults": {
            "discount_rate": 50,
            "present_vs_future": 0
        }
    },
    "regulatory_focus": {
        "type": "continuous",
        "fields": ["promotion", "prevention"],
        "range": (0, 100),
        "default": 50
    },
    "emotion_profile": {
        "type": "mixed",
        "continuous_fields": ["baseline_valence", "emotional_range", "recovery_speed"],
        "categorical_fields": {
            "stress_response": ["fight", "flight", "freeze", "fawn"]
        },
        "range": (0, 100),
        "default": 50
    }
}

# 關鍵測試維度（對回答風格影響最大的）
KEY_DIMENSIONS = [
    ("language_style", "verbosity"),      # 影響回答長度
    ("language_style", "formality"),      # 影響用詞正式程度
    ("language_style", "directness"),     # 影響表達直接程度
    ("language_style", "emotion_expression"),  # 影響情緒表達
    ("big5", "neuroticism"),              # 影響焦慮程度
    ("big5", "extraversion"),             # 影響外向程度
    ("big5", "openness"),                 # 影響開放程度
    ("risk_profile", "overall"),          # 影響風險態度
    ("decision_style", "risk_seeking"),   # 影響冒險程度
]


def create_base_persona() -> Dict:
    """建立一個中性基準 persona（所有連續值設為中間值）"""
    return {
        "id": "base_neutral",
        "lastName": "Test",
        "gender": "Male",
        "age": 35,
        "occupation": "Office Worker",
        "timesOfOverseasTravelInsurance": 3,
        "purchasedBrand": ["General"],
        "purchasedChannels": ["online"],
        "personalBackground": "一般受訪者",
        "big5": {
            "openness": 50,
            "conscientiousness": 50,
            "extraversion": 50,
            "agreeableness": 50,
            "neuroticism": 50
        },
        "risk_profile": {
            "overall": 50,
            "financial": 50,
            "ethical": 50,
            "social": 50,
            "health": 50
        },
        "decision_style": {
            "primary": "analytical",
            "secondary": "intuitive",
            "risk_seeking": 50,
            "info_processing": "satisficer",
            "social_preference": "collaborative"
        },
        "time_preference": {
            "discount_rate": 50,
            "planning_horizon": "medium_term",
            "present_vs_future": 0
        },
        "regulatory_focus": {
            "promotion": 50,
            "prevention": 50
        },
        "language_style": {
            "formality": 50,
            "directness": 50,
            "emotion_expression": 50,
            "verbosity": 50
        },
        "emotion_profile": {
            "baseline_valence": 50,
            "emotional_range": 50,
            "stress_response": "freeze",
            "recovery_speed": 50
        }
    }


def set_ppv_value(persona: Dict, category: str, field: str, value) -> Dict:
    """設定 persona 中特定 PPV 欄位的值"""
    result = deepcopy(persona)
    if category not in result:
        result[category] = {}
    result[category][field] = value
    return result


def generate_single_dimension_extremes(
    dimension: Tuple[str, str],
    extreme_values: List[int] = [5, 95],
    include_boundaries: bool = True
) -> List[Tuple[str, Dict]]:
    """
    生成單一維度極端測試 personas

    Args:
        dimension: (category, field) 例如 ("language_style", "verbosity")
        extreme_values: 要測試的極端值
        include_boundaries: 是否包含邊界值 (0, 33, 34, 66, 67, 100)

    Returns:
        List of (name, persona) tuples
    """
    category, field = dimension
    results = []

    # 基本極端值
    test_values = list(extreme_values)

    # 加入邊界值
    if include_boundaries:
        test_values.extend([0, 33, 34, 66, 67, 100])

    # 去重並排序
    test_values = sorted(set(test_values))

    for value in test_values:
        base = create_base_persona()
        persona = set_ppv_value(base, category, field, value)
        persona["id"] = f"extreme_{category}_{field}_{value}"

        # 根據值設定合適的背景描述
        if value <= 20:
            level = "極低"
        elif value <= 40:
            level = "低"
        elif value <= 60:
            level = "中等"
        elif value <= 80:
            level = "高"
        else:
            level = "極高"

        persona["personalBackground"] = f"{field} {level}（{value}）的測試受訪者"

        name = f"單維度極端: {category}.{field}={value}"
        results.append((name, persona))

    return results


def generate_multi_dimension_cross_extremes(
    dimensions: List[Tuple[str, str]] = None,
    values: List[int] = [10, 90]
) -> List[Tuple[str, Dict]]:
    """
    生成多維度交叉極端測試

    測試多個維度同時極端時的交互效果
    例如：高 verbosity + 低 formality vs 低 verbosity + 高 formality
    """
    if dimensions is None:
        # 使用默認的關鍵維度對
        dimensions = [
            ("language_style", "verbosity"),
            ("language_style", "formality"),
        ]

    results = []

    # 生成所有組合
    from itertools import product

    combinations = list(product(values, repeat=len(dimensions)))

    for combo in combinations:
        base = create_base_persona()
        persona = base

        combo_parts = []
        for (cat, field), val in zip(dimensions, combo):
            persona = set_ppv_value(persona, cat, field, val)
            combo_parts.append(f"{field}={val}")

        combo_str = "_".join([str(v) for v in combo])
        persona["id"] = f"cross_extreme_{combo_str}"
        persona["personalBackground"] = f"交叉極端測試: {', '.join(combo_parts)}"

        name = f"多維度交叉: {', '.join(combo_parts)}"
        results.append((name, persona))

    return results


def generate_diagonal_extremes() -> List[Tuple[str, Dict]]:
    """
    生成對角極端 personas

    所有維度同時極端化：
    - 全高：所有連續值 = 95
    - 全低：所有連續值 = 5
    - 對立：一半高一半低
    """
    results = []

    # 全高極端
    all_high = create_base_persona()
    all_high["id"] = "diagonal_all_high"
    for cat, spec in PPV_STRUCTURE.items():
        if cat not in all_high:
            continue
        if spec["type"] == "continuous":
            for field in spec["fields"]:
                all_high[cat][field] = 95
        elif spec["type"] == "mixed":
            for field in spec.get("continuous_fields", []):
                if field == "present_vs_future":
                    all_high[cat][field] = 90
                else:
                    all_high[cat][field] = 95
    all_high["personalBackground"] = "所有維度極端高值的測試受訪者"
    results.append(("對角極端: 全高", all_high))

    # 全低極端
    all_low = create_base_persona()
    all_low["id"] = "diagonal_all_low"
    for cat, spec in PPV_STRUCTURE.items():
        if cat not in all_low:
            continue
        if spec["type"] == "continuous":
            for field in spec["fields"]:
                all_low[cat][field] = 5
        elif spec["type"] == "mixed":
            for field in spec.get("continuous_fields", []):
                if field == "present_vs_future":
                    all_low[cat][field] = -90
                else:
                    all_low[cat][field] = 5
    all_low["personalBackground"] = "所有維度極端低值的測試受訪者"
    results.append(("對角極端: 全低", all_low))

    # 對立極端：外向/衝動 vs 內向/謹慎
    extrovert_impulsive = create_base_persona()
    extrovert_impulsive["id"] = "diagonal_extrovert_impulsive"
    extrovert_impulsive["big5"] = {
        "openness": 90, "conscientiousness": 15, "extraversion": 95,
        "agreeableness": 70, "neuroticism": 20
    }
    extrovert_impulsive["risk_profile"]["overall"] = 90
    extrovert_impulsive["decision_style"]["risk_seeking"] = 95
    extrovert_impulsive["language_style"] = {
        "verbosity": 85, "formality": 20, "directness": 90, "emotion_expression": 90
    }
    extrovert_impulsive["personalBackground"] = "外向衝動型：高外向、高風險、低謹慎"
    results.append(("對角極端: 外向衝動型", extrovert_impulsive))

    introvert_cautious = create_base_persona()
    introvert_cautious["id"] = "diagonal_introvert_cautious"
    introvert_cautious["big5"] = {
        "openness": 30, "conscientiousness": 95, "extraversion": 15,
        "agreeableness": 60, "neuroticism": 75
    }
    introvert_cautious["risk_profile"]["overall"] = 10
    introvert_cautious["decision_style"]["risk_seeking"] = 10
    introvert_cautious["language_style"] = {
        "verbosity": 25, "formality": 85, "directness": 30, "emotion_expression": 20
    }
    introvert_cautious["personalBackground"] = "內向謹慎型：低外向、低風險、高謹慎"
    results.append(("對角極端: 內向謹慎型", introvert_cautious))

    return results


def generate_boundary_sensitivity_test(
    dimension: Tuple[str, str],
    boundaries: List[int] = [33, 66]
) -> List[Tuple[str, Dict]]:
    """
    生成邊界敏感度測試

    測試 threshold 附近的行為（例如 verbosity 在 32, 33, 34 時的差異）
    """
    category, field = dimension
    results = []

    for boundary in boundaries:
        for offset in [-2, -1, 0, 1, 2]:
            value = boundary + offset
            if value < 0 or value > 100:
                continue

            base = create_base_persona()
            persona = set_ppv_value(base, category, field, value)
            persona["id"] = f"boundary_{category}_{field}_{value}"
            persona["personalBackground"] = f"邊界測試: {field}={value} (邊界={boundary})"

            name = f"邊界敏感度: {field}={value} (邊界{boundary}±)"
            results.append((name, persona))

    return results


def generate_gradient_test(
    dimension: Tuple[str, str],
    steps: int = 10
) -> List[Tuple[str, Dict]]:
    """
    生成梯度測試 personas

    從 0 到 100 等間距生成，用於測試連續變化的效果
    """
    category, field = dimension
    results = []

    for i in range(steps + 1):
        value = int(i * 100 / steps)

        base = create_base_persona()
        persona = set_ppv_value(base, category, field, value)
        persona["id"] = f"gradient_{category}_{field}_{value}"
        persona["personalBackground"] = f"梯度測試: {field}={value}"

        name = f"梯度測試 {i+1}/{steps+1}: {field}={value}"
        results.append((name, persona))

    return results


def generate_all_key_dimension_extremes() -> List[Tuple[str, Dict]]:
    """
    為所有關鍵維度生成極端測試
    """
    results = []

    for dim in KEY_DIMENSIONS:
        # 每個維度只測試 5, 50, 95 三個點（減少測試數量）
        extremes = generate_single_dimension_extremes(
            dim,
            extreme_values=[5, 50, 95],
            include_boundaries=False
        )
        results.extend(extremes)

    return results


def generate_ppv_driven_test_suite() -> Dict[str, List[Tuple[str, Dict]]]:
    """
    生成完整的 PPV 驅動測試套件

    Returns:
        Dict mapping test category name to list of (name, persona) tuples
    """
    return {
        "verbosity_gradient": generate_gradient_test(
            ("language_style", "verbosity"), steps=10
        ),
        "key_dimension_extremes": generate_all_key_dimension_extremes(),
        "verbosity_boundaries": generate_boundary_sensitivity_test(
            ("language_style", "verbosity"), boundaries=[33, 66]
        ),
        "emotion_expression_boundaries": generate_boundary_sensitivity_test(
            ("language_style", "emotion_expression"), boundaries=[33, 66]
        ),
        "verbosity_formality_cross": generate_multi_dimension_cross_extremes(
            [("language_style", "verbosity"), ("language_style", "formality")],
            values=[10, 50, 90]
        ),
        "verbosity_emotion_cross": generate_multi_dimension_cross_extremes(
            [("language_style", "verbosity"), ("language_style", "emotion_expression")],
            values=[10, 90]
        ),
        "diagonal_extremes": generate_diagonal_extremes(),
    }


# ===== 用於 test_ppv_interview_stability.py 的接口 =====

def create_ppv_driven_extreme_personas() -> List[Tuple[str, Dict]]:
    """
    建立用於訪談穩定性測試的 PPV 驅動極端 personas

    這個函數取代原本的 create_extreme_test_personas()
    """
    results = []

    # 1. 核心: verbosity 梯度測試（5 個點）
    verbosity_gradient = generate_gradient_test(
        ("language_style", "verbosity"), steps=4  # 0, 25, 50, 75, 100
    )
    results.extend(verbosity_gradient)

    # 2. 情緒表達極端
    emotion_extremes = generate_single_dimension_extremes(
        ("language_style", "emotion_expression"),
        extreme_values=[10, 90],
        include_boundaries=False
    )
    results.extend(emotion_extremes)

    # 3. 風險態度極端
    risk_extremes = generate_single_dimension_extremes(
        ("risk_profile", "overall"),
        extreme_values=[10, 90],
        include_boundaries=False
    )
    results.extend(risk_extremes)

    # 4. 神經質極端（影響焦慮表達）
    neuroticism_extremes = generate_single_dimension_extremes(
        ("big5", "neuroticism"),
        extreme_values=[10, 90],
        include_boundaries=False
    )
    results.extend(neuroticism_extremes)

    # 5. 對角極端（整體人格極端）
    diagonal = generate_diagonal_extremes()
    results.extend(diagonal)

    # 6. Verbosity + Formality 交叉
    cross = generate_multi_dimension_cross_extremes(
        [("language_style", "verbosity"), ("language_style", "formality")],
        values=[15, 85]
    )
    results.extend(cross)

    return results


if __name__ == "__main__":
    # 測試生成器
    print("=" * 70)
    print("PPV 數值驅動極端測試生成器")
    print("=" * 70)

    # 顯示關鍵維度
    print("\n關鍵測試維度:")
    for cat, field in KEY_DIMENSIONS:
        print(f"  • {cat}.{field}")

    # 生成測試套件
    test_suite = generate_ppv_driven_test_suite()

    print(f"\n測試套件包含 {len(test_suite)} 個類別:")
    total_personas = 0
    for category, personas in test_suite.items():
        print(f"  • {category}: {len(personas)} 個 personas")
        total_personas += len(personas)

    print(f"\n總計: {total_personas} 個測試 personas")

    # 顯示範例
    print("\n" + "=" * 70)
    print("範例 Personas:")
    print("=" * 70)

    sample_categories = ["verbosity_gradient", "diagonal_extremes"]
    for cat in sample_categories:
        if cat in test_suite:
            print(f"\n【{cat}】")
            for name, persona in test_suite[cat][:3]:
                print(f"  • {name}")
                print(f"    ID: {persona['id']}")
                if "language_style" in persona:
                    ls = persona["language_style"]
                    print(f"    Language Style: V={ls.get('verbosity', 'N/A')}, F={ls.get('formality', 'N/A')}, "
                          f"D={ls.get('directness', 'N/A')}, E={ls.get('emotion_expression', 'N/A')}")
