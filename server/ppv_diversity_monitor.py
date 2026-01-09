"""
PPV (Persona Personality Variance) 多元化監測系統
使用 Core/Style 解耦方法來檢測真實多樣性

基於完整 PPV Schema 欄位進行分析：

【人格特質】
- big5: openness, conscientiousness, extraversion, agreeableness, neuroticism (0-100)
- hexaco: honesty_humility, emotionality, extraversion, agreeableness, conscientiousness, openness (0-100)
- disc: dominance, influence, steadiness, conscientiousness (0-100)
- mbti: E_I, S_N, T_F, J_P (-100 to 100)
- enneagram: primary_type (1-9), wing (1-9), instinct (sp/so/sx)

【價值觀與道德】
- schwartz_values: 10種價值觀 (0-100)
- moral_foundations: Care, Fairness, Loyalty, Authority, Sanctity (0-100)

【決策風格】
- risk_profile: overall, financial, ethical, social, health (0-100)
- time_preference: discount_rate, planning_horizon (0-100), present_vs_future (-100 to 100)
- regulatory_focus: promotion, prevention (0-100)
- decision_style: primary, secondary, risk_seeking, info_processing, social_preference

【溝通風格】
- language_style: formality, directness, emotion_expression, verbosity, questioning_style (0-100)
- emotion_profile: baseline_valence, emotional_range, stress_response, recovery_speed (0-100)
- social_profile: trust_default, cooperation_tendency, conformity, independence (0-100)

【行為指標】
- behavioral_indicators: information_seeking, comparison_behavior, price_sensitivity, brand_loyalty (0-100)

監測指標:
- ESS (Effective Sample Size): 有效樣本數 ↑
- Mean Min-Distance: 平均最小距離 ↑
- Occupied Bins: 佔用格數 ↑
- Min Entropy: 各維度最小熵 ≥ τ
"""

import numpy as np
from typing import List, Dict, Any, Tuple
from collections import Counter
import json
from datetime import datetime

# ========== PPV Trait Dimensions 定義 ==========
# 基於完整 PPV Schema

def _create_continuous_dim(name: str, range_vals: list = None, bins: list = None) -> dict:
    """輔助函數：建立連續型維度定義"""
    return {
        "name": name,
        "type": "continuous",
        "range": range_vals or [0, 100],
        "bins": bins or ["LOW (0-33)", "MEDIUM (34-66)", "HIGH (67-100)"]
    }

def _create_categorical_dim(name: str, values: list) -> dict:
    """輔助函數：建立類別型維度定義"""
    return {
        "name": name,
        "type": "categorical",
        "values": values
    }

# Core Traits - 影響實際決策行為的維度
CORE_TRAIT_DIMENSIONS = {
    # === Big5 人格 ===
    "big5_openness": _create_continuous_dim("開放性 (Openness)"),
    "big5_conscientiousness": _create_continuous_dim("盡責性 (Conscientiousness)"),
    "big5_extraversion": _create_continuous_dim("外向性 (Extraversion)"),
    "big5_agreeableness": _create_continuous_dim("親和性 (Agreeableness)"),
    "big5_neuroticism": _create_continuous_dim("神經質 (Neuroticism)"),

    # === Risk Profile ===
    "risk_overall": _create_continuous_dim("整體風險承受"),
    "risk_financial": _create_continuous_dim("財務風險承受"),
    "risk_ethical": _create_continuous_dim("倫理風險承受"),
    "risk_social": _create_continuous_dim("社交風險承受"),
    "risk_health": _create_continuous_dim("健康風險承受"),

    # === Decision Style ===
    "decision_primary": _create_categorical_dim("主要決策風格",
        ["analytical", "intuitive", "dependent", "avoidant", "spontaneous"]),
    "decision_risk_seeking": _create_continuous_dim("風險尋求傾向"),
    "decision_info_processing": _create_categorical_dim("資訊處理方式",
        ["maximizer", "satisficer", "optimizer"]),

    # === Time Preference ===
    "time_discount_rate": _create_continuous_dim("時間折扣率"),
    "time_planning_horizon": _create_categorical_dim("規劃時間範圍",
        ["immediate", "short_term", "medium_term", "long_term"]),
    "time_present_vs_future": _create_continuous_dim("現在vs未來導向", [-100, 100]),

    # === Regulatory Focus ===
    "regulatory_promotion": _create_continuous_dim("促進焦點"),
    "regulatory_prevention": _create_continuous_dim("預防焦點"),
}

# Extended Traits - HEXACO, DISC, MBTI, Enneagram
EXTENDED_PERSONALITY_DIMENSIONS = {
    # === HEXACO ===
    "hexaco_honesty_humility": _create_continuous_dim("誠實-謙遜"),
    "hexaco_emotionality": _create_continuous_dim("情緒性"),
    "hexaco_extraversion": _create_continuous_dim("外向性 (HEXACO)"),
    "hexaco_agreeableness": _create_continuous_dim("親和性 (HEXACO)"),
    "hexaco_conscientiousness": _create_continuous_dim("盡責性 (HEXACO)"),
    "hexaco_openness": _create_continuous_dim("經驗開放性 (HEXACO)"),

    # === DISC ===
    "disc_dominance": _create_continuous_dim("支配性 (D)"),
    "disc_influence": _create_continuous_dim("影響力 (I)"),
    "disc_steadiness": _create_continuous_dim("穩定性 (S)"),
    "disc_conscientiousness": _create_continuous_dim("謹慎性 (C)"),

    # === MBTI ===
    "mbti_E_I": _create_continuous_dim("外向-內向 (E-I)", [-100, 100]),
    "mbti_S_N": _create_continuous_dim("實感-直覺 (S-N)", [-100, 100]),
    "mbti_T_F": _create_continuous_dim("思考-情感 (T-F)", [-100, 100]),
    "mbti_J_P": _create_continuous_dim("判斷-感知 (J-P)", [-100, 100]),

    # === Enneagram ===
    "enneagram_primary": _create_categorical_dim("九型人格主型",
        ["1", "2", "3", "4", "5", "6", "7", "8", "9"]),
    "enneagram_instinct": _create_categorical_dim("本能變體",
        ["sp", "so", "sx"]),
}

# Style Traits - 溝通與社交風格
STYLE_TRAIT_DIMENSIONS = {
    # === Language Style ===
    "language_formality": _create_continuous_dim("正式程度"),
    "language_directness": _create_continuous_dim("直接程度"),
    "language_emotion_expression": _create_continuous_dim("情緒表達"),
    "language_verbosity": _create_continuous_dim("冗長程度"),

    # === Emotion Profile ===
    "emotion_baseline_valence": _create_continuous_dim("基準情緒效價"),
    "emotion_range": _create_continuous_dim("情緒範圍"),
    "emotion_stress_response": _create_categorical_dim("壓力反應",
        ["fight", "flight", "freeze", "fawn"]),

    # === Social Profile ===
    "social_trust_default": _create_continuous_dim("預設信任度"),
    "social_cooperation": _create_continuous_dim("合作傾向"),
    "social_conformity": _create_continuous_dim("從眾傾向"),
    "social_independence": _create_continuous_dim("獨立性"),

    # === Moral Foundations ===
    "moral_care": _create_continuous_dim("道德-關懷"),
    "moral_fairness": _create_continuous_dim("道德-公平"),
    "moral_loyalty": _create_continuous_dim("道德-忠誠"),
    "moral_authority": _create_continuous_dim("道德-權威"),
    "moral_sanctity": _create_continuous_dim("道德-聖潔"),
}

# Behavioral Indicators - 行為指標
BEHAVIORAL_DIMENSIONS = {
    "behavior_info_seeking": _create_continuous_dim("資訊搜尋傾向"),
    "behavior_comparison": _create_continuous_dim("比較行為"),
    "behavior_price_sensitivity": _create_continuous_dim("價格敏感度"),
    "behavior_brand_loyalty": _create_continuous_dim("品牌忠誠度"),
}


class PPVDiversityMonitor:
    """PPV 多元化監測器 - 基於完整 PPV Schema"""

    def __init__(self, entropy_threshold: float = 0.5, use_extended: bool = False):
        self.entropy_threshold = entropy_threshold
        self.core_dimensions = CORE_TRAIT_DIMENSIONS
        self.extended_dimensions = EXTENDED_PERSONALITY_DIMENSIONS
        self.style_dimensions = STYLE_TRAIT_DIMENSIONS
        self.behavioral_dimensions = BEHAVIORAL_DIMENSIONS
        self.use_extended = use_extended

    def extract_core_traits(self, persona: Dict[str, Any]) -> Dict[str, Any]:
        """從 persona 提取 core traits (完整 PPV Schema)"""
        traits = {}

        # === Big5 ===
        big5 = persona.get('big5', {})
        traits['big5_openness'] = big5.get('openness', 50)
        traits['big5_conscientiousness'] = big5.get('conscientiousness', 50)
        traits['big5_extraversion'] = big5.get('extraversion', 50)
        traits['big5_agreeableness'] = big5.get('agreeableness', 50)
        traits['big5_neuroticism'] = big5.get('neuroticism', 50)

        # === Risk Profile ===
        risk = persona.get('risk_profile', {})
        traits['risk_overall'] = risk.get('overall', 50)
        traits['risk_financial'] = risk.get('financial', 50)
        traits['risk_ethical'] = risk.get('ethical', 50)
        traits['risk_social'] = risk.get('social', 50)
        traits['risk_health'] = risk.get('health', 50)

        # === Decision Style ===
        decision = persona.get('decision_style', {})
        if isinstance(decision, str):
            # 舊格式：decision_style 是字串
            traits['decision_primary'] = decision.lower()
        else:
            # 新格式：decision_style 是物件
            traits['decision_primary'] = decision.get('primary', 'intuitive').lower()
            traits['decision_risk_seeking'] = decision.get('risk_seeking', 50)
            traits['decision_info_processing'] = decision.get('info_processing', 'satisficer')

        # === Time Preference ===
        time_pref = persona.get('time_preference', {})
        traits['time_discount_rate'] = time_pref.get('discount_rate', 50)
        traits['time_planning_horizon'] = time_pref.get('planning_horizon', 'medium_term')
        traits['time_present_vs_future'] = time_pref.get('present_vs_future', 0)

        # === Regulatory Focus ===
        reg_focus = persona.get('regulatory_focus', {})
        traits['regulatory_promotion'] = reg_focus.get('promotion', 50)
        traits['regulatory_prevention'] = reg_focus.get('prevention', 50)

        return traits

    def extract_extended_traits(self, persona: Dict[str, Any]) -> Dict[str, Any]:
        """從 persona 提取擴展人格特質 (HEXACO, DISC, MBTI, Enneagram)"""
        traits = {}

        # === HEXACO ===
        hexaco = persona.get('hexaco', {})
        traits['hexaco_honesty_humility'] = hexaco.get('honesty_humility', 50)
        traits['hexaco_emotionality'] = hexaco.get('emotionality', 50)
        traits['hexaco_extraversion'] = hexaco.get('extraversion', 50)
        traits['hexaco_agreeableness'] = hexaco.get('agreeableness', 50)
        traits['hexaco_conscientiousness'] = hexaco.get('conscientiousness', 50)
        traits['hexaco_openness'] = hexaco.get('openness', 50)

        # === DISC ===
        disc = persona.get('disc', {})
        traits['disc_dominance'] = disc.get('dominance', 50)
        traits['disc_influence'] = disc.get('influence', 50)
        traits['disc_steadiness'] = disc.get('steadiness', 50)
        traits['disc_conscientiousness'] = disc.get('conscientiousness', 50)

        # === MBTI ===
        mbti = persona.get('mbti', {})
        traits['mbti_E_I'] = mbti.get('E_I', 0)
        traits['mbti_S_N'] = mbti.get('S_N', 0)
        traits['mbti_T_F'] = mbti.get('T_F', 0)
        traits['mbti_J_P'] = mbti.get('J_P', 0)

        # === Enneagram ===
        enneagram = persona.get('enneagram', {})
        traits['enneagram_primary'] = str(enneagram.get('primary_type', '5'))
        traits['enneagram_instinct'] = enneagram.get('instinct', 'sp')

        return traits

    def extract_style_traits(self, persona: Dict[str, Any]) -> Dict[str, Any]:
        """從 persona 提取 style traits (溝通與社交風格)"""
        traits = {}

        # === Language Style ===
        lang = persona.get('language_style', {})
        traits['language_formality'] = lang.get('formality', 50)
        traits['language_directness'] = lang.get('directness', 50)
        traits['language_emotion_expression'] = lang.get('emotion_expression', 50)
        traits['language_verbosity'] = lang.get('verbosity', 50)

        # === Emotion Profile ===
        emotion = persona.get('emotion_profile', {})
        traits['emotion_baseline_valence'] = emotion.get('baseline_valence', 50)
        traits['emotion_range'] = emotion.get('emotional_range', 50)
        traits['emotion_stress_response'] = emotion.get('stress_response', 'flight')

        # === Social Profile ===
        social = persona.get('social_profile', {})
        traits['social_trust_default'] = social.get('trust_default', 50)
        traits['social_cooperation'] = social.get('cooperation_tendency', 50)
        traits['social_conformity'] = social.get('conformity', 50)
        traits['social_independence'] = social.get('independence', 50)

        # === Moral Foundations ===
        moral = persona.get('moral_foundations', {})
        traits['moral_care'] = moral.get('Care', 50)
        traits['moral_fairness'] = moral.get('Fairness', 50)
        traits['moral_loyalty'] = moral.get('Loyalty', 50)
        traits['moral_authority'] = moral.get('Authority', 50)
        traits['moral_sanctity'] = moral.get('Sanctity', 50)

        return traits

    def extract_behavioral_traits(self, persona: Dict[str, Any]) -> Dict[str, Any]:
        """從 persona 提取行為指標"""
        traits = {}

        behavior = persona.get('behavioral_indicators', {})
        traits['behavior_info_seeking'] = behavior.get('information_seeking', 50)
        traits['behavior_comparison'] = behavior.get('comparison_behavior', 50)
        traits['behavior_price_sensitivity'] = behavior.get('price_sensitivity', 50)
        traits['behavior_brand_loyalty'] = behavior.get('brand_loyalty', 50)

        return traits

    def check_ppv_completeness(self, persona: Dict[str, Any]) -> Dict[str, Any]:
        """檢查 persona 的 PPV 欄位完整性"""
        required_fields = ['big5', 'risk_profile', 'decision_style']
        optional_core = ['time_preference', 'regulatory_focus']
        extended_fields = ['hexaco', 'disc', 'mbti', 'enneagram']
        style_fields = ['language_style', 'emotion_profile', 'social_profile', 'moral_foundations']
        behavioral_fields = ['behavioral_indicators']

        result = {
            'has_basic': all(f in persona for f in required_fields),
            'has_extended_core': any(f in persona for f in optional_core),
            'has_extended_personality': any(f in persona for f in extended_fields),
            'has_style': any(f in persona for f in style_fields),
            'has_behavioral': any(f in persona for f in behavioral_fields),
            'missing_required': [f for f in required_fields if f not in persona],
            'present_optional': [f for f in optional_core + extended_fields + style_fields + behavioral_fields if f in persona]
        }

        # 計算完整度分數
        total_fields = len(required_fields) + len(optional_core) + len(extended_fields) + len(style_fields) + len(behavioral_fields)
        present_count = len([f for f in required_fields + optional_core + extended_fields + style_fields + behavioral_fields if f in persona])
        result['completeness_score'] = round(present_count / total_fields, 2)

        return result

    def _value_to_bin(self, value: float, num_bins: int = 3) -> int:
        """將連續值轉換為 bin index"""
        if value <= 33:
            return 0
        elif value <= 66:
            return 1
        else:
            return 2

    def _value_to_bin_label(self, value: float) -> str:
        """將連續值轉換為 bin 標籤"""
        if value <= 33:
            return "LOW (0-33)"
        elif value <= 66:
            return "MEDIUM (34-66)"
        else:
            return "HIGH (67-100)"

    def compute_diversity_metrics(self, personas: List[Dict[str, Any]]) -> Dict[str, Any]:
        """計算所有多樣性指標"""
        if not personas:
            return {"error": "No personas provided"}

        # 檢查 PPV 完整性
        completeness_results = [self.check_ppv_completeness(p) for p in personas]
        personas_with_basic = [p for p, c in zip(personas, completeness_results) if c['has_basic']]
        personas_missing_ppv = [p for p, c in zip(personas, completeness_results) if not c['has_basic']]

        # 計算平均完整度
        avg_completeness = np.mean([c['completeness_score'] for c in completeness_results])

        if not personas_with_basic:
            return {
                "error": "All personas missing required PPV fields (big5, risk_profile, decision_style)",
                "hint": "Please ensure personas have at least big5, risk_profile, and decision_style fields",
                "missing_count": len(personas),
                "completeness_report": completeness_results
            }

        # 提取所有 traits (只使用有 PPV 欄位的 personas)
        all_core_traits = [self.extract_core_traits(p) for p in personas_with_basic]
        all_style_traits = [self.extract_style_traits(p) for p in personas_with_basic]
        all_extended_traits = [self.extract_extended_traits(p) for p in personas_with_basic] if self.use_extended else []
        all_behavioral_traits = [self.extract_behavioral_traits(p) for p in personas_with_basic]

        metrics = {
            "timestamp": datetime.now().isoformat(),
            "total_personas": len(personas),
            "personas_with_ppv": len(personas_with_basic),
            "personas_missing_ppv": len(personas_missing_ppv),
            "avg_completeness": round(avg_completeness, 2),
            "ppv_schema_detected": True,
            "core_metrics": self._compute_trait_metrics(all_core_traits, self.core_dimensions, "core"),
            "style_metrics": self._compute_trait_metrics(all_style_traits, self.style_dimensions, "style"),
            "behavioral_metrics": self._compute_trait_metrics(all_behavioral_traits, self.behavioral_dimensions, "behavioral"),
            "combined_metrics": self._compute_combined_metrics(all_core_traits),
            "trait_summary": self._compute_trait_summary(all_core_traits),
            "completeness_details": {
                "missing_personas": [p.get('id', 'unknown') for p in personas_missing_ppv],
                "sample_missing_fields": completeness_results[0]['missing_required'] if completeness_results else []
            },
            "diversity_health": None
        }

        # 如果使用擴展維度，加入擴展指標
        if self.use_extended and all_extended_traits:
            metrics["extended_metrics"] = self._compute_trait_metrics(
                all_extended_traits, self.extended_dimensions, "extended"
            )

        # 計算整體健康度
        metrics["diversity_health"] = self._compute_health_score(metrics)

        return metrics

    def _compute_trait_summary(self, all_traits: List[Dict]) -> Dict:
        """計算每個 trait 的統計摘要"""
        summary = {}
        n = len(all_traits)

        for dim_key, dim_info in self.core_dimensions.items():
            # 安全地取得值
            values = [t.get(dim_key) for t in all_traits]
            valid_values = [v for v in values if v is not None]
            if not valid_values:
                continue

            if dim_info.get("type") == "categorical":
                # 類別型 - 計算分布
                counter = Counter(valid_values)
                summary[dim_key] = {
                    "name": dim_info["name"],
                    "type": "categorical",
                    "distribution": {k: round(v/len(valid_values), 3) for k, v in counter.items()},
                    "mode": counter.most_common(1)[0][0] if counter else None,
                    "unique_count": len(counter)
                }
            else:
                # 連續型 - 計算統計
                values_array = np.array(valid_values)
                summary[dim_key] = {
                    "name": dim_info["name"],
                    "type": "continuous",
                    "mean": round(float(np.mean(values_array)), 1),
                    "std": round(float(np.std(values_array)), 1),
                    "min": round(float(np.min(values_array)), 1),
                    "max": round(float(np.max(values_array)), 1),
                    "range": round(float(np.max(values_array) - np.min(values_array)), 1)
                }

        return summary

    def _compute_trait_metrics(self, all_traits: List[Dict], dimensions: Dict, trait_type: str) -> Dict:
        """計算單一類型特質的指標"""
        n = len(all_traits)
        dim_metrics = {}
        entropies = []

        for dim_key, dim_info in dimensions.items():
            # 安全地取得值，跳過不存在的維度
            values = [t.get(dim_key) for t in all_traits]
            # 過濾掉 None 值
            valid_values = [v for v in values if v is not None]
            if not valid_values:
                continue  # 跳過沒有資料的維度
            values = valid_values

            n_valid = len(values)  # 使用有效數量

            if dim_info.get("type") == "categorical":
                # 類別型變數
                counter = Counter(values)
                all_categories = dim_info.get("values", list(counter.keys()))
                distribution = {v: counter.get(v, 0) / n_valid for v in all_categories}
                occupied_bins = len([v for v in counter.values() if v > 0])
                total_bins = len(all_categories)
            else:
                # 連續型變數 - 轉換為 bins
                binned_values = [self._value_to_bin_label(v) for v in values]
                counter = Counter(binned_values)
                bins = dim_info.get("bins", ["LOW (0-33)", "MEDIUM (34-66)", "HIGH (67-100)"])
                distribution = {b: counter.get(b, 0) / n_valid for b in bins}
                occupied_bins = len([v for v in counter.values() if v > 0])
                total_bins = len(bins)

            # 計算熵
            entropy = self._compute_entropy(list(counter.values()), n_valid)
            entropies.append(entropy)
            max_entropy = np.log2(total_bins) if total_bins > 1 else 1

            dim_metrics[dim_key] = {
                "name": dim_info["name"],
                "distribution": distribution,
                "entropy": round(entropy, 3),
                "max_entropy": round(max_entropy, 3),
                "normalized_entropy": round(entropy / max_entropy if max_entropy > 0 else 0, 3),
                "occupied_bins": occupied_bins,
                "total_bins": total_bins,
                "bin_coverage": round(occupied_bins / total_bins, 3)
            }

        return {
            "dimensions": dim_metrics,
            "min_entropy": round(float(min(entropies)), 3) if entropies else 0,
            "mean_entropy": round(float(np.mean(entropies)), 3) if entropies else 0,
            "entropy_threshold_met": bool(min(entropies) >= self.entropy_threshold) if entropies else False
        }

    def _compute_combined_metrics(self, all_core_traits: List[Dict]) -> Dict:
        """計算組合指標（ESS, Mean Min-Distance）"""
        n = len(all_core_traits)

        if n < 2:
            return {
                "ess": n,
                "ess_ratio": 1.0,
                "mean_min_distance": 0,
                "unique_combinations": n,
                "uniqueness_ratio": 1.0,
                "occupied_bins": 1,
                "total_possible_bins": 1,
                "bin_coverage": 1.0
            }

        # 找出所有 personas 都有的維度
        available_dims = []
        for dim_key in sorted(self.core_dimensions.keys()):
            if all(traits.get(dim_key) is not None for traits in all_core_traits):
                available_dims.append(dim_key)

        if not available_dims:
            return {
                "ess": n,
                "ess_ratio": 1.0,
                "mean_min_distance": 0,
                "unique_combinations": n,
                "uniqueness_ratio": 1.0,
                "occupied_bins": 1,
                "total_possible_bins": 1,
                "bin_coverage": 1.0,
                "dimensions_used": 0
            }

        # 將 traits 轉換為向量 (normalized)
        vectors = []
        for traits in all_core_traits:
            vec = []
            for dim_key in available_dims:
                dim_info = self.core_dimensions[dim_key]
                value = traits.get(dim_key, 50)  # 預設值 50

                if dim_info.get("type") == "categorical":
                    # 類別型 - 轉換為 one-hot 的 index
                    categories = dim_info.get("values", [])
                    idx = categories.index(value) if value in categories else 0
                    normalized = idx / max(len(categories) - 1, 1)
                else:
                    # 連續型 - 歸一化到 [0, 1]
                    normalized = value / 100.0

                vec.append(normalized)
            vectors.append(vec)

        vectors = np.array(vectors)

        # 計算 ESS - 使用 trait signature 的唯一性
        trait_signatures = []
        for traits in all_core_traits:
            sig = tuple(
                self._value_to_bin(traits.get(k, 50)) if self.core_dimensions[k].get("type") != "categorical"
                else traits.get(k, 'unknown')
                for k in available_dims
            )
            trait_signatures.append(sig)

        unique_count = len(set(trait_signatures))
        ess = unique_count

        # 計算 Mean Min-Distance (Euclidean)
        min_distances = []
        for i in range(n):
            distances = []
            for j in range(n):
                if i != j:
                    dist = np.sqrt(np.sum((vectors[i] - vectors[j]) ** 2))
                    distances.append(dist)
            if distances:
                min_distances.append(min(distances))

        mean_min_dist = np.mean(min_distances) if min_distances else 0

        # 計算 occupied bins（在多維空間中）
        grid_size = 3
        bin_coords = []
        for vec in vectors:
            coord = tuple(int(v * grid_size) if v < 1 else grid_size - 1 for v in vec)
            bin_coords.append(coord)

        occupied_bins = len(set(bin_coords))
        total_possible_bins = grid_size ** len(available_dims)

        return {
            "ess": int(ess),
            "ess_ratio": round(float(ess / n), 3),
            "dimensions_used": len(available_dims),
            "mean_min_distance": round(float(mean_min_dist), 4),
            "unique_combinations": int(unique_count),
            "uniqueness_ratio": round(float(unique_count / n), 3),
            "occupied_bins": int(occupied_bins),
            "total_possible_bins": int(total_possible_bins),
            "bin_coverage": round(float(occupied_bins / min(total_possible_bins, n * 2)), 3)
        }

    def _compute_entropy(self, counts: List[int], total: int) -> float:
        """計算 Shannon 熵"""
        if total == 0:
            return 0
        probs = [c / total for c in counts if c > 0]
        return -sum(p * np.log2(p) for p in probs)

    def _compute_health_score(self, metrics: Dict) -> Dict:
        """計算整體多樣性健康分數"""
        core = metrics["core_metrics"]
        combined = metrics["combined_metrics"]

        scores = {}
        warnings = []

        # 1. ESS ratio (理想: 1.0 = 完美，0.7 = 合格)
        ess_ratio = combined["ess_ratio"]
        scores["ess"] = ess_ratio  # 直接使用比例，更有區分度
        if ess_ratio < 0.5:
            warnings.append(f"⚠️ ESS ratio 過低 ({ess_ratio:.2f})，存在重複 personas")

        # 2. Mean min-distance (理想: > 0.3，合格: > 0.15)
        mean_dist = combined["mean_min_distance"]
        # 使用 sigmoid-like 函數，0.3 以上為高分，0.15 以下為低分
        scores["distance"] = min(mean_dist / 0.35, 1.0)
        if mean_dist < 0.1:
            warnings.append(f"⚠️ 平均最小距離過低 ({mean_dist:.3f})，personas 過於相似")

        # 3. Bin coverage (理想: > 0.6，合格: > 0.3)
        bin_cov = combined["bin_coverage"]
        scores["coverage"] = min(bin_cov / 0.6, 1.0)  # 提高標準
        if bin_cov < 0.2:
            warnings.append(f"⚠️ Bin coverage 過低 ({bin_cov:.2f})，分布過於集中")

        # 4. Mean normalized entropy (理想: > 0.8，合格: > 0.5)
        mean_norm_ent = core["mean_entropy"] / 1.585 if core["mean_entropy"] else 0  # 1.585 = log2(3) 最大熵
        scores["entropy"] = mean_norm_ent
        if mean_norm_ent < 0.5:
            warnings.append(f"⚠️ 平均正規化熵過低 ({mean_norm_ent:.2f})，分布不夠均勻")

        # 找出低多樣性的維度
        low_diversity_dims = []
        for dim_key, dim_metrics in core["dimensions"].items():
            if dim_metrics["normalized_entropy"] < 0.5:
                low_diversity_dims.append({
                    "dimension": dim_metrics["name"],
                    "entropy": dim_metrics["normalized_entropy"],
                    "coverage": dim_metrics["bin_coverage"]
                })

        if low_diversity_dims:
            warnings.append(f"⚠️ {len(low_diversity_dims)} 個維度多樣性不足")

        # 計算總分
        overall_score = float(np.mean(list(scores.values())))

        # 判定狀態
        if overall_score >= 0.8:
            status = "🟢 HEALTHY"
        elif overall_score >= 0.6:
            status = "🟡 MODERATE"
        elif overall_score >= 0.4:
            status = "🟠 WARNING"
        else:
            status = "🔴 CRITICAL"

        return {
            "overall_score": round(float(overall_score), 3),
            "status": status,
            "component_scores": {k: round(float(v), 3) for k, v in scores.items()},
            "warnings": warnings,
            "low_diversity_dimensions": low_diversity_dims,
            "is_real_diversity": bool(overall_score >= 0.6 and not low_diversity_dims)
        }

    def generate_report(self, personas: List[Dict[str, Any]]) -> str:
        """生成可讀的多樣性報告"""
        metrics = self.compute_diversity_metrics(personas)

        if "error" in metrics:
            return f"Error: {metrics['error']}\nHint: {metrics.get('hint', '')}"

        report = []
        report.append("=" * 60)
        report.append("📊 PPV 多元化監測報告 (基於真實 PPV Schema)")
        report.append("=" * 60)
        report.append(f"時間: {metrics['timestamp']}")
        report.append(f"受測 Personas: {metrics['total_personas']}")
        report.append(f"PPV Schema: ✓ 檢測到")
        report.append("")

        # 健康狀態
        health = metrics["diversity_health"]
        report.append(f"整體狀態: {health['status']}")
        report.append(f"總分: {health['overall_score']:.1%}")
        report.append("")

        # 組件分數
        report.append("組件分數:")
        for k, v in health["component_scores"].items():
            bar = "█" * int(v * 10) + "░" * (10 - int(v * 10))
            report.append(f"  {k:12s}: [{bar}] {v:.1%}")
        report.append("")

        # Trait Summary
        report.append("-" * 40)
        report.append("📈 Trait 統計摘要:")
        report.append("-" * 40)
        for dim_key, summary in metrics["trait_summary"].items():
            if summary["type"] == "continuous":
                report.append(f"  {summary['name']}: μ={summary['mean']}, σ={summary['std']}, range=[{summary['min']}-{summary['max']}]")
            else:
                dist_str = ", ".join([f"{k}:{int(v*100)}%" for k, v in summary["distribution"].items() if v > 0])
                report.append(f"  {summary['name']}: {dist_str}")
        report.append("")

        # Core Metrics - Entropy
        report.append("-" * 40)
        report.append("🎯 Core Traits 熵分析:")
        report.append("-" * 40)
        core = metrics["core_metrics"]
        report.append(f"  最小熵: {core['min_entropy']:.3f} (閾值: {self.entropy_threshold})")
        report.append(f"  平均熵: {core['mean_entropy']:.3f}")
        report.append(f"  熵達標: {'✓' if core['entropy_threshold_met'] else '✗'}")
        report.append("")

        # Combined Metrics
        report.append("-" * 40)
        report.append("📐 組合指標:")
        report.append("-" * 40)
        combined = metrics["combined_metrics"]
        report.append(f"  ESS: {combined['ess']} ({combined['ess_ratio']:.0%} of n)")
        report.append(f"  Mean Min-Distance: {combined['mean_min_distance']:.4f}")
        report.append(f"  Unique Combinations: {combined['unique_combinations']}")
        report.append(f"  Bin Coverage: {combined['occupied_bins']}/{combined['total_possible_bins']} ({combined['bin_coverage']:.1%})")
        report.append("")

        # 警告
        if health["warnings"]:
            report.append("-" * 40)
            report.append("⚠️ 警告:")
            report.append("-" * 40)
            for w in health["warnings"]:
                report.append(f"  {w}")
            report.append("")

        # 結論
        report.append("=" * 60)
        if health["is_real_diversity"]:
            report.append("✅ 結論: 多樣性為【真實多樣性】")
            report.append("   Big5, Risk Profile 等核心維度分布良好")
        else:
            report.append("❌ 結論: 可能存在【假多樣性】")
            report.append("   需要增加 Core traits 的變異")
        report.append("=" * 60)

        return "\n".join(report)


# ========== API Functions ==========

def analyze_persona_diversity(personas: List[Dict[str, Any]],
                              entropy_threshold: float = 0.5) -> Dict[str, Any]:
    """分析 personas 的多樣性（供 API 使用）"""
    monitor = PPVDiversityMonitor(entropy_threshold=entropy_threshold)
    return monitor.compute_diversity_metrics(personas)


def generate_diversity_report(personas: List[Dict[str, Any]],
                              entropy_threshold: float = 0.5) -> str:
    """生成多樣性報告（供 API 使用）"""
    monitor = PPVDiversityMonitor(entropy_threshold=entropy_threshold)
    return monitor.generate_report(personas)


# ========== CLI Test ==========

if __name__ == "__main__":
    import os

    # 載入真實的 Vietnam personas
    script_dir = os.path.dirname(os.path.abspath(__file__))

    all_personas = []

    # 嘗試載入 vietnam_personas.json
    vietnam1_path = os.path.join(script_dir, "vietnam_personas.json")
    if os.path.exists(vietnam1_path):
        with open(vietnam1_path, 'r', encoding='utf-8') as f:
            personas1 = json.load(f)
            all_personas.extend(personas1)
            print(f"Loaded {len(personas1)} personas from vietnam_personas.json")

    # 嘗試載入 vietnam2_personas.json
    vietnam2_path = os.path.join(script_dir, "vietnam2_personas.json")
    if os.path.exists(vietnam2_path):
        with open(vietnam2_path, 'r', encoding='utf-8') as f:
            personas2 = json.load(f)
            all_personas.extend(personas2)
            print(f"Loaded {len(personas2)} personas from vietnam2_personas.json")

    if not all_personas:
        print("No personas found!")
        exit(1)

    print(f"\nTotal: {len(all_personas)} personas")
    print("\n" + "=" * 60)
    print("PPV 多元化監測系統測試")
    print("=" * 60 + "\n")

    monitor = PPVDiversityMonitor()

    # 生成報告
    report = monitor.generate_report(all_personas)
    print(report)
