#!/usr/bin/env python3
"""
PPV 極端案例測試
測試 PPV 多樣性監測系統對極端情況的穩定性

測試案例：
1. 全同質化 - 所有 persona 完全相同
2. 極端兩極化 - 只有最高和最低值
3. 單一維度變異 - 只有一個維度有變化
4. 全隨機極端值 - 所有值都是 0 或 100
5. 缺失欄位 - 大量缺失的 PPV 欄位
6. 邊界值 - 所有值都在邊界 (0, 33, 34, 66, 67, 100)
"""

import json
import random
from pathlib import Path
import sys

# 添加 server 目錄到路徑
sys.path.insert(0, str(Path(__file__).parent))

from ppv_diversity_monitor import PPVDiversityMonitor

def create_homogeneous_personas(n: int = 20) -> list:
    """案例 1: 全同質化 - 所有 persona 完全相同"""
    base_persona = {
        "id": "homogeneous_0",
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
            "primary": "rational",
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
        }
    }

    return [
        {**base_persona, "id": f"homogeneous_{i}"}
        for i in range(n)
    ]


def create_polarized_personas(n: int = 20) -> list:
    """案例 2: 極端兩極化 - 只有最高和最低值"""
    personas = []
    for i in range(n):
        is_high = i % 2 == 0
        val = 100 if is_high else 0
        mid_val = 100 if is_high else -100

        personas.append({
            "id": f"polarized_{i}",
            "big5": {
                "openness": val,
                "conscientiousness": val,
                "extraversion": val,
                "agreeableness": val,
                "neuroticism": val
            },
            "risk_profile": {
                "overall": val,
                "financial": val,
                "ethical": val,
                "social": val,
                "health": val
            },
            "decision_style": {
                "primary": "rational" if is_high else "avoidant",
                "secondary": "intuitive" if is_high else "dependent",
                "risk_seeking": val,
                "info_processing": "maximizer" if is_high else "satisficer",
                "social_preference": "independent" if is_high else "collaborative"
            },
            "time_preference": {
                "discount_rate": val,
                "planning_horizon": "long_term" if is_high else "short_term",
                "present_vs_future": mid_val
            },
            "regulatory_focus": {
                "promotion": val,
                "prevention": 100 - val
            }
        })

    return personas


def create_single_dimension_variance(n: int = 20) -> list:
    """案例 3: 單一維度變異 - 只有 big5_openness 有變化"""
    personas = []
    for i in range(n):
        personas.append({
            "id": f"single_var_{i}",
            "big5": {
                "openness": int(i * 100 / (n - 1)),  # 0 到 100 線性分布
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
                "primary": "rational",
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
            }
        })

    return personas


def create_random_extreme_personas(n: int = 20) -> list:
    """案例 4: 全隨機極端值 - 所有值都是 0 或 100"""
    random.seed(42)
    personas = []

    decision_styles = ["analytical", "intuitive", "dependent", "avoidant", "spontaneous"]
    info_processing = ["maximizer", "satisficer", "optimizer"]
    social_prefs = ["independent", "collaborative", "delegator"]
    horizons = ["short_term", "medium_term", "long_term"]

    for i in range(n):
        personas.append({
            "id": f"random_extreme_{i}",
            "big5": {
                "openness": random.choice([0, 100]),
                "conscientiousness": random.choice([0, 100]),
                "extraversion": random.choice([0, 100]),
                "agreeableness": random.choice([0, 100]),
                "neuroticism": random.choice([0, 100])
            },
            "risk_profile": {
                "overall": random.choice([0, 100]),
                "financial": random.choice([0, 100]),
                "ethical": random.choice([0, 100]),
                "social": random.choice([0, 100]),
                "health": random.choice([0, 100])
            },
            "decision_style": {
                "primary": random.choice(decision_styles),
                "secondary": random.choice(decision_styles),
                "risk_seeking": random.choice([0, 100]),
                "info_processing": random.choice(info_processing),
                "social_preference": random.choice(social_prefs)
            },
            "time_preference": {
                "discount_rate": random.choice([0, 100]),
                "planning_horizon": random.choice(horizons),
                "present_vs_future": random.choice([-100, 100])
            },
            "regulatory_focus": {
                "promotion": random.choice([0, 100]),
                "prevention": random.choice([0, 100])
            }
        })

    return personas


def create_missing_fields_personas(n: int = 20) -> list:
    """案例 5: 缺失欄位 - 大量缺失的 PPV 欄位"""
    personas = []

    for i in range(n):
        persona = {"id": f"missing_{i}"}

        # 只有一半有 big5
        if i % 2 == 0:
            persona["big5"] = {
                "openness": 30 + i * 2,
                "conscientiousness": 40 + i,
                "extraversion": 50,
                "agreeableness": 60 - i,
                "neuroticism": 45
            }

        # 只有 1/3 有 risk_profile
        if i % 3 == 0:
            persona["risk_profile"] = {
                "overall": 50 + i,
                "financial": 40,
                "ethical": 60,
                "social": 50,
                "health": 45
            }

        # 只有 1/4 有 decision_style
        if i % 4 == 0:
            persona["decision_style"] = {
                "primary": "rational",
                "risk_seeking": 50,
                "info_processing": "satisficer"
            }

        personas.append(persona)

    return personas


def create_boundary_value_personas(n: int = 24) -> list:
    """案例 6: 邊界值 - 所有值都在 bin 邊界"""
    boundary_values = [0, 33, 34, 66, 67, 100]
    personas = []

    for i in range(n):
        val = boundary_values[i % len(boundary_values)]

        personas.append({
            "id": f"boundary_{i}",
            "big5": {
                "openness": val,
                "conscientiousness": boundary_values[(i + 1) % 6],
                "extraversion": boundary_values[(i + 2) % 6],
                "agreeableness": boundary_values[(i + 3) % 6],
                "neuroticism": boundary_values[(i + 4) % 6]
            },
            "risk_profile": {
                "overall": val,
                "financial": boundary_values[(i + 1) % 6],
                "ethical": boundary_values[(i + 2) % 6],
                "social": boundary_values[(i + 3) % 6],
                "health": boundary_values[(i + 4) % 6]
            },
            "decision_style": {
                "primary": ["analytical", "intuitive", "dependent", "avoidant", "spontaneous"][i % 5],
                "secondary": "rational",
                "risk_seeking": val,
                "info_processing": ["maximizer", "satisficer", "optimizer"][i % 3],
                "social_preference": "collaborative"
            },
            "time_preference": {
                "discount_rate": val,
                "planning_horizon": ["short_term", "medium_term", "long_term"][i % 3],
                "present_vs_future": [-100, -50, 0, 50, 100][i % 5]
            },
            "regulatory_focus": {
                "promotion": val,
                "prevention": boundary_values[(i + 3) % 6]
            }
        })

    return personas


def create_perfect_diversity_personas(n: int = 27) -> list:
    """案例 7: 完美多樣性 - 每個 bin 組合都有 persona"""
    personas = []
    idx = 0

    # 為 3 個主要維度創建 3x3x3 = 27 種組合
    bins = [15, 50, 85]  # LOW, MEDIUM, HIGH 中心值

    for b1 in bins:
        for b2 in bins:
            for b3 in bins:
                personas.append({
                    "id": f"perfect_{idx}",
                    "big5": {
                        "openness": b1,
                        "conscientiousness": b2,
                        "extraversion": b3,
                        "agreeableness": bins[idx % 3],
                        "neuroticism": bins[(idx + 1) % 3]
                    },
                    "risk_profile": {
                        "overall": b1,
                        "financial": b2,
                        "ethical": b3,
                        "social": bins[idx % 3],
                        "health": bins[(idx + 1) % 3]
                    },
                    "decision_style": {
                        "primary": ["analytical", "intuitive", "dependent", "avoidant", "spontaneous"][idx % 5],
                        "secondary": "rational",
                        "risk_seeking": b1,
                        "info_processing": ["maximizer", "satisficer", "optimizer"][idx % 3],
                        "social_preference": ["independent", "collaborative", "delegator"][idx % 3]
                    },
                    "time_preference": {
                        "discount_rate": b2,
                        "planning_horizon": ["short_term", "medium_term", "long_term"][idx % 3],
                        "present_vs_future": [-75, 0, 75][idx % 3]
                    },
                    "regulatory_focus": {
                        "promotion": b1,
                        "prevention": b3
                    }
                })
                idx += 1

    return personas


def run_extreme_tests():
    """執行所有極端案例測試"""
    print("=" * 70)
    print("PPV 極端案例測試")
    print("=" * 70)

    monitor = PPVDiversityMonitor(entropy_threshold=0.5)

    test_cases = [
        ("1. 全同質化 (所有 persona 完全相同)", create_homogeneous_personas(20)),
        ("2. 極端兩極化 (只有 0 和 100)", create_polarized_personas(20)),
        ("3. 單一維度變異 (只有 openness 變化)", create_single_dimension_variance(20)),
        ("4. 隨機極端值 (0/100 隨機)", create_random_extreme_personas(20)),
        ("5. 缺失欄位 (大量缺失)", create_missing_fields_personas(20)),
        ("6. 邊界值測試 (0,33,34,66,67,100)", create_boundary_value_personas(24)),
        ("7. 完美多樣性 (3x3x3 組合)", create_perfect_diversity_personas(27)),
    ]

    results = []

    for name, personas in test_cases:
        print(f"\n{'─' * 70}")
        print(f"測試: {name}")
        print(f"{'─' * 70}")
        print(f"Personas 數量: {len(personas)}")

        try:
            metrics = monitor.compute_diversity_metrics(personas)

            if "error" in metrics:
                print(f"❌ 錯誤: {metrics['error']}")
                results.append({
                    "name": name,
                    "status": "ERROR",
                    "error": metrics["error"]
                })
                continue

            health = metrics.get("diversity_health", {})

            print(f"\n📊 結果:")
            print(f"   • 有效 Personas: {metrics.get('personas_with_ppv', 0)}/{metrics.get('total_personas', 0)}")
            print(f"   • 整體分數: {health.get('overall_score', 0):.1%}")
            print(f"   • 真實多樣性: {'✅ 是' if health.get('is_real_diversity') else '❌ 否'}")
            print(f"   • 狀態: {health.get('status', 'N/A')}")

            # Core metrics
            core = metrics.get("core_metrics", {})
            print(f"\n📈 Core Metrics:")
            print(f"   • 最小熵: {core.get('min_entropy', 0):.3f}")
            print(f"   • 平均熵: {core.get('avg_entropy', 0):.3f}")
            print(f"   • 低熵維度數: {core.get('low_entropy_count', 0)}")

            # Combined metrics
            combined = metrics.get("combined_metrics", {})
            print(f"\n🔗 Combined Metrics:")
            print(f"   • ESS: {combined.get('ess', 0)} ({combined.get('ess_ratio', 0):.1%})")
            print(f"   • 唯一組合: {combined.get('unique_combinations', 0)}")
            print(f"   • 平均最小距離: {combined.get('mean_min_distance', 0):.4f}")

            # Warnings
            warnings = health.get("warnings", [])
            if warnings:
                print(f"\n⚠️ 警告 ({len(warnings)}):")
                for w in warnings[:5]:  # 只顯示前 5 個
                    print(f"   • {w}")
                if len(warnings) > 5:
                    print(f"   ... 還有 {len(warnings) - 5} 個警告")

            results.append({
                "name": name,
                "status": "OK",
                "personas_count": len(personas),
                "valid_personas": metrics.get('personas_with_ppv', 0),
                "overall_score": health.get('overall_score', 0),
                "is_real_diversity": health.get('is_real_diversity', False),
                "min_entropy": core.get('min_entropy', 0),
                "ess_ratio": combined.get('ess_ratio', 0),
                "warnings_count": len(warnings)
            })

        except Exception as e:
            print(f"❌ 執行錯誤: {str(e)}")
            import traceback
            traceback.print_exc()
            results.append({
                "name": name,
                "status": "EXCEPTION",
                "error": str(e)
            })

    # 總結
    print("\n" + "=" * 70)
    print("測試總結")
    print("=" * 70)

    print(f"\n{'案例':<45} {'狀態':<8} {'分數':<8} {'真實多樣性':<12} {'警告':<6}")
    print("─" * 85)

    for r in results:
        if r["status"] == "OK":
            score = f"{r['overall_score']:.1%}"
            diversity = "✅" if r["is_real_diversity"] else "❌"
            warnings = str(r["warnings_count"])
        else:
            score = "N/A"
            diversity = "N/A"
            warnings = "N/A"

        print(f"{r['name']:<45} {r['status']:<8} {score:<8} {diversity:<12} {warnings:<6}")

    print("\n" + "=" * 70)
    print("預期結果分析:")
    print("=" * 70)
    print("""
    1. 全同質化: 應該顯示 ❌ 假多樣性，ESS=1，min_entropy=0
    2. 極端兩極化: 可能顯示多樣性，但分布不均勻
    3. 單一維度變異: 應該顯示 ❌ 假多樣性，大部分維度熵=0
    4. 隨機極端值: 可能顯示多樣性，但可能有 bin 覆蓋問題
    5. 缺失欄位: 應該報告缺失，可能無法計算
    6. 邊界值測試: 測試 bin 分類的邊界處理
    7. 完美多樣性: 應該顯示 ✅ 真實多樣性，高分數
    """)

    return results


if __name__ == "__main__":
    run_extreme_tests()
