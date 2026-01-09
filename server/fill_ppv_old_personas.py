#!/usr/bin/env python3
"""
Script to fill in extended PPV fields for 58 old personas in vietnam_personas.json.
Generates diverse values based on existing persona traits (big5, occupation, age, etc.)
"""

import json
import random
import hashlib
from pathlib import Path

# Seed for reproducibility based on persona ID
def get_seed(persona_id: str) -> int:
    return int(hashlib.md5(persona_id.encode()).hexdigest()[:8], 16)

def generate_hexaco(big5: dict, seed: int) -> dict:
    """Generate HEXACO based on Big5 with some variance."""
    random.seed(seed)
    return {
        "honesty_humility": max(0, min(100, big5.get("agreeableness", 50) + random.randint(-20, 20))),
        "emotionality": max(0, min(100, big5.get("neuroticism", 50) + random.randint(-15, 25))),
        "extraversion": max(0, min(100, big5.get("extraversion", 50) + random.randint(-10, 10))),
        "agreeableness": max(0, min(100, big5.get("agreeableness", 50) + random.randint(-15, 15))),
        "conscientiousness": max(0, min(100, big5.get("conscientiousness", 50) + random.randint(-10, 10))),
        "openness": max(0, min(100, big5.get("openness", 50) + random.randint(-10, 15)))
    }

def generate_disc(big5: dict, seed: int) -> dict:
    """Generate DISC profile based on Big5."""
    random.seed(seed + 1)
    return {
        "dominance": max(0, min(100, 100 - big5.get("agreeableness", 50) + random.randint(-15, 15))),
        "influence": max(0, min(100, big5.get("extraversion", 50) + random.randint(-10, 15))),
        "steadiness": max(0, min(100, 100 - big5.get("neuroticism", 50) + random.randint(-10, 10))),
        "conscientiousness": max(0, min(100, big5.get("conscientiousness", 50) + random.randint(-10, 10)))
    }

def generate_mbti(big5: dict, seed: int) -> dict:
    """Generate MBTI dimensions (-100 to 100) based on Big5."""
    random.seed(seed + 2)
    return {
        "E_I": max(-100, min(100, (big5.get("extraversion", 50) - 50) * 2 + random.randint(-20, 20))),
        "S_N": max(-100, min(100, (big5.get("openness", 50) - 50) * 2 + random.randint(-25, 25))),
        "T_F": max(-100, min(100, (big5.get("agreeableness", 50) - 50) * -2 + random.randint(-20, 20))),
        "J_P": max(-100, min(100, (big5.get("conscientiousness", 50) - 50) * 2 + random.randint(-20, 20)))
    }

def generate_enneagram(big5: dict, decision_style: str, seed: int) -> dict:
    """Generate Enneagram type based on personality traits."""
    random.seed(seed + 3)

    # Map decision styles to likely enneagram types
    style_types = {
        "Intuitive": [4, 5, 7, 9],
        "Rational": [1, 3, 5, 6],
        "Dependent": [2, 6, 9],
        "Avoidant": [5, 9, 4],
        "Spontaneous": [7, 4, 8]
    }

    likely_types = style_types.get(decision_style, [1, 2, 3, 4, 5, 6, 7, 8, 9])
    primary = random.choice(likely_types)

    # Wing is adjacent type
    wings = {
        1: [9, 2], 2: [1, 3], 3: [2, 4], 4: [3, 5], 5: [4, 6],
        6: [5, 7], 7: [6, 8], 8: [7, 9], 9: [8, 1]
    }
    wing = random.choice(wings[primary])

    instincts = ["sp", "so", "sx"]
    instinct = random.choice(instincts)

    return {
        "primary_type": primary,
        "wing": wing,
        "instinct": instinct
    }

def generate_time_preference(age: int, risk_profile: dict, seed: int) -> dict:
    """Generate time preference based on age and risk profile."""
    random.seed(seed + 4)

    # Older people tend to have lower discount rates and shorter planning horizons
    base_discount = 50 - (age - 30) // 2 + random.randint(-15, 15)
    discount_rate = max(10, min(90, base_discount))

    horizons = ["short_term", "medium_term", "long_term"]
    if age < 30:
        horizon = random.choices(horizons, weights=[0.2, 0.4, 0.4])[0]
    elif age < 50:
        horizon = random.choices(horizons, weights=[0.3, 0.5, 0.2])[0]
    else:
        horizon = random.choices(horizons, weights=[0.4, 0.4, 0.2])[0]

    # Risk takers are more present-focused
    overall_risk = risk_profile.get("overall", 50) if isinstance(risk_profile, dict) else 50
    present_vs_future = max(-50, min(50, (overall_risk - 50) + random.randint(-20, 20)))

    return {
        "discount_rate": discount_rate,
        "planning_horizon": horizon,
        "present_vs_future": present_vs_future
    }

def generate_regulatory_focus(big5: dict, occupation: str, seed: int) -> dict:
    """Generate regulatory focus based on personality and occupation."""
    random.seed(seed + 5)

    # Promotion-focused occupations
    promotion_jobs = ["Marketing", "Sales", "Designer", "Artist", "Entrepreneur", "Tour Guide"]
    prevention_jobs = ["Engineer", "Analyst", "Accountant", "Manager", "Professor", "Doctor", "Lawyer"]

    promotion_boost = 10 if any(j.lower() in occupation.lower() for j in promotion_jobs) else 0
    prevention_boost = 10 if any(j.lower() in occupation.lower() for j in prevention_jobs) else 0

    promotion = max(20, min(95, big5.get("openness", 50) + promotion_boost + random.randint(-10, 20)))
    prevention = max(20, min(95, big5.get("conscientiousness", 50) + prevention_boost + random.randint(-10, 20)))

    return {
        "promotion": promotion,
        "prevention": prevention
    }

def generate_decision_style_extended(decision_style: str, big5: dict, seed: int) -> dict:
    """Expand decision_style from string to full object."""
    random.seed(seed + 6)

    primary = decision_style.lower() if decision_style else "rational"

    secondary_options = ["rational", "intuitive", "dependent", "avoidant", "spontaneous"]
    secondary_options = [s for s in secondary_options if s != primary]
    secondary = random.choice(secondary_options)

    # Risk seeking based on decision style
    risk_base = {"intuitive": 55, "spontaneous": 70, "rational": 40, "dependent": 35, "avoidant": 25}
    risk_seeking = max(10, min(90, risk_base.get(primary, 50) + random.randint(-15, 15)))

    info_processing = random.choice(["maximizer", "satisficer"])
    social_preference = random.choice(["autonomous", "collaborative", "delegator"])

    return {
        "primary": primary,
        "secondary": secondary,
        "risk_seeking": risk_seeking,
        "info_processing": info_processing,
        "social_preference": social_preference
    }

def generate_language_style(big5: dict, age: int, seed: int) -> dict:
    """Generate language style based on personality and age."""
    random.seed(seed + 7)

    formality = max(20, min(95, 40 + (age - 25) // 2 + random.randint(-15, 20)))
    directness = max(20, min(95, 100 - big5.get("agreeableness", 50) + random.randint(-20, 20)))
    verbosity = max(20, min(95, big5.get("extraversion", 50) + random.randint(-15, 20)))
    emotionality = max(20, min(95, big5.get("neuroticism", 50) + random.randint(-10, 25)))
    technicality = max(20, min(95, big5.get("openness", 50) + random.randint(-15, 20)))

    return {
        "formality": formality,
        "directness": directness,
        "verbosity": verbosity,
        "emotionality": emotionality,
        "technicality": technicality
    }

def generate_emotion_profile(big5: dict, seed: int) -> dict:
    """Generate emotion profile based on Big5."""
    random.seed(seed + 8)

    baseline_positivity = max(20, min(95, big5.get("extraversion", 50) + random.randint(-10, 20)))
    emotional_volatility = max(15, min(90, big5.get("neuroticism", 50) + random.randint(-15, 15)))
    stress_tolerance = max(20, min(95, 100 - big5.get("neuroticism", 50) + random.randint(-15, 15)))
    empathy = max(25, min(95, big5.get("agreeableness", 50) + random.randint(-10, 20)))

    return {
        "baseline_positivity": baseline_positivity,
        "emotional_volatility": emotional_volatility,
        "stress_tolerance": stress_tolerance,
        "empathy": empathy
    }

def generate_social_profile(big5: dict, seed: int) -> dict:
    """Generate social profile based on Big5."""
    random.seed(seed + 9)

    trust_propensity = max(20, min(90, big5.get("agreeableness", 50) + random.randint(-15, 20)))
    social_confidence = max(20, min(95, big5.get("extraversion", 50) + random.randint(-10, 15)))

    conflict_styles = ["avoiding", "accommodating", "competing", "collaborating", "compromising"]
    if big5.get("agreeableness", 50) > 60:
        conflict_style = random.choices(conflict_styles, weights=[0.3, 0.35, 0.05, 0.2, 0.1])[0]
    elif big5.get("agreeableness", 50) < 40:
        conflict_style = random.choices(conflict_styles, weights=[0.15, 0.1, 0.35, 0.2, 0.2])[0]
    else:
        conflict_style = random.choice(conflict_styles)

    influence_susceptibility = max(20, min(85, 100 - big5.get("conscientiousness", 50) + random.randint(-15, 15)))

    return {
        "trust_propensity": trust_propensity,
        "social_confidence": social_confidence,
        "conflict_style": conflict_style,
        "influence_susceptibility": influence_susceptibility
    }

def generate_behavioral_indicators(big5: dict, risk_profile: dict, seed: int) -> dict:
    """Generate behavioral indicators."""
    random.seed(seed + 10)

    overall_risk = risk_profile.get("overall", 50) if isinstance(risk_profile, dict) else 50

    # Decision speed: high openness + low conscientiousness = faster
    decision_speed = max(15, min(90, big5.get("openness", 50) - big5.get("conscientiousness", 50) // 2 + 50 + random.randint(-15, 15)))

    # Information seeking: high conscientiousness + openness
    information_seeking = max(25, min(95, (big5.get("conscientiousness", 50) + big5.get("openness", 50)) // 2 + random.randint(-10, 15)))

    # Social proof reliance: high agreeableness, low openness
    social_proof_reliance = max(20, min(85, big5.get("agreeableness", 50) - big5.get("openness", 50) // 3 + 30 + random.randint(-15, 15)))

    # Price sensitivity: inverse of risk tolerance
    price_sensitivity = max(20, min(90, 100 - overall_risk + random.randint(-15, 15)))

    return {
        "decision_speed": decision_speed,
        "information_seeking": information_seeking,
        "social_proof_reliance": social_proof_reliance,
        "price_sensitivity": price_sensitivity
    }

def fill_extended_ppv(persona: dict) -> dict:
    """Fill in all extended PPV fields for a single persona."""
    persona_id = persona.get("id", "unknown")
    seed = get_seed(persona_id)

    big5 = persona.get("big5", {
        "openness": 50,
        "conscientiousness": 50,
        "extraversion": 50,
        "agreeableness": 50,
        "neuroticism": 50
    })

    age = persona.get("age", 35)
    occupation = persona.get("occupation", "")
    decision_style = persona.get("decision_style", "Rational")
    risk_profile = persona.get("risk_profile", {"overall": 50})

    # Generate all extended fields
    persona["hexaco"] = generate_hexaco(big5, seed)
    persona["disc"] = generate_disc(big5, seed)
    persona["mbti"] = generate_mbti(big5, seed)
    persona["enneagram"] = generate_enneagram(big5, decision_style, seed)
    persona["time_preference"] = generate_time_preference(age, risk_profile, seed)
    persona["regulatory_focus"] = generate_regulatory_focus(big5, occupation, seed)
    persona["decision_style"] = generate_decision_style_extended(decision_style, big5, seed)
    persona["language_style"] = generate_language_style(big5, age, seed)
    persona["emotion_profile"] = generate_emotion_profile(big5, seed)
    persona["social_profile"] = generate_social_profile(big5, seed)
    persona["behavioral_indicators"] = generate_behavioral_indicators(big5, risk_profile, seed)

    return persona

def main():
    # Load personas
    personas_path = Path(__file__).parent / "vietnam_personas.json"

    with open(personas_path, "r", encoding="utf-8") as f:
        personas = json.load(f)

    print(f"Loaded {len(personas)} personas from vietnam_personas.json")

    # Fill in extended PPV for each persona
    updated_count = 0
    for persona in personas:
        # Check if already has extended fields
        if "hexaco" not in persona:
            fill_extended_ppv(persona)
            updated_count += 1
            print(f"  Updated: {persona.get('id', 'unknown')}")

    print(f"\nUpdated {updated_count} personas with extended PPV fields")

    # Save updated personas
    with open(personas_path, "w", encoding="utf-8") as f:
        json.dump(personas, f, ensure_ascii=False, indent=2)

    print(f"Saved updated personas to {personas_path}")

    # Print sample of first updated persona
    if personas:
        sample = personas[0]
        print(f"\nSample persona ({sample.get('id')}) extended fields:")
        for field in ["hexaco", "disc", "mbti", "enneagram", "time_preference",
                      "regulatory_focus", "decision_style", "language_style",
                      "emotion_profile", "social_profile", "behavioral_indicators"]:
            if field in sample:
                print(f"  {field}: {sample[field]}")

if __name__ == "__main__":
    main()
