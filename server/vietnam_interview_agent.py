"""
越南旅遊險訪談 Agent
用於模擬越南受訪者回答訪談問題
支援自動抓取問題中的 URL 內容
"""
import os
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.openai import OpenAIChat

# 匯入 URL 抓取工具
from url_fetcher import extract_and_fetch_urls

load_dotenv()

def interview_vietnam_persona(
    persona: Dict[str, Any],
    question: str,
    sub_questions: List[str] = None
) -> str:
    """
    使用 Agno Agent 模擬越南受訪者回答問題

    Args:
        persona: 受訪者基本資料
        question: 當前訪談問題
        sub_questions: 追問項目列表

    Returns:
        模擬的回答文字
    """

    # 建立受訪者背景描述
    background = f"""
# INTERVIEWEE PROFILE:
- Name: {persona.get('lastName', 'Unknown')} {'先生' if persona.get('gender') == 'Male' else '小姐'}
- Age: {persona.get('age', 30)} tuổi (years old)
- Occupation: {persona.get('occupation', 'Unknown')}
- Travel Insurance Experience: Bought {persona.get('timesOfOverseasTravelInsurance', 0)} times
- Brands Used: {', '.join(persona.get('purchasedBrand', [])) or 'None'}
- Purchase Channels: {', '.join(persona.get('purchasedChannels', [])) or 'None'}
- Background: {persona.get('personalBackground', 'No additional background')}
"""

    # 建立訪談歷史摘要
    history_summary = ""
    if persona.get('interviewHistory'):
        history_summary = "\n# PREVIOUS INTERVIEW RESPONSES:\n"
        for record in persona['interviewHistory'][-5:]:  # 只取最近5筆
            history_summary += f"Q: {record.get('question', '')}\n"
            history_summary += f"A: {record.get('answer', '')}\n\n"

    # 建立追問項目
    sub_q_text = ""
    if sub_questions:
        sub_q_text = "\n## Sub-questions to address:\n"
        for sq in sub_questions:
            sub_q_text += f"- {sq}\n"

    # 🌐 自動抓取問題中的 URL 內容
    urls_found, url_content = extract_and_fetch_urls(question, sub_questions)
    if urls_found:
        print(f"🌐 [URL Fetcher] Found {len(urls_found)} URL(s), injecting real content into prompt")

    # 使用 persona ID 的 hash 來產生穩定但多樣化的個性特徵
    import hashlib
    persona_id = persona.get('id', str(persona.get('lastName', '')))
    hash_val = int(hashlib.md5(persona_id.encode()).hexdigest(), 16)

    # 多種可能的瀏覽起點（不基於刻板印象）
    starting_points = [
        "You always scroll to the BOTTOM first to see the footer and company info - it's a habit",
        "You instinctively look for a SEARCH bar first - you hate navigating menus",
        "You immediately try to find PRICE information before reading anything else",
        "You check the URL bar first to make sure it's the official site, not a scam",
        "You look at the IMAGES and banners first - visuals tell you a lot about a company",
        "You look for CONTACT INFO or customer service number first - you want to know you can reach someone",
        "You try to find REVIEWS or testimonials first before trusting any website",
        "You check if there's an ENGLISH option - sometimes Vietnamese sites have translation errors",
        "You look for the MOBILE APP download link - you prefer doing things on your phone",
        "You scroll slowly and READ everything carefully - you don't want to miss important details",
        "You look for COMPARISON tables immediately - you want to see options side by side",
        "You check if there's a CHAT button - you prefer asking questions directly",
    ]

    # 多種可能的關注焦點
    focus_points = [
        "Coverage for MEDICAL emergencies abroad is your biggest concern",
        "You care most about FLIGHT delay/cancellation coverage",
        "BAGGAGE loss protection is what you look for first",
        "You want to know the CLAIMS PROCESS - how easy is it to get money back?",
        "You're mainly concerned about COVID-related coverage these days",
        "You care about whether it covers ADVENTURE activities (diving, hiking)",
        "Family coverage and whether it includes CHILDREN is your priority",
        "You want to know if pre-existing CONDITIONS are covered",
        "The REPUTATION of the insurance company matters most to you",
        "You focus on whether there's 24/7 HOTLINE support in your destination country",
        "You want to see ACTUAL EXAMPLES of claim payouts, not just limits",
        "You're curious about the FINE PRINT and exclusions",
    ]

    # 多種可能的情緒/反應傾向
    reaction_styles = [
        "You tend to be SKEPTICAL - you've been burned by hidden fees before",
        "You're generally OPTIMISTIC and trusting of established brands",
        "You get IMPATIENT when websites are slow or confusing",
        "You're THOROUGH - you read everything twice before deciding",
        "You're INDECISIVE - you always want to compare with other options first",
        "You make decisions QUICKLY based on gut feeling",
        "You're PRICE-SENSITIVE - if it seems expensive, you'll look elsewhere",
        "You value CONVENIENCE over price - you'll pay more for easier processes",
        "You're CAUTIOUS about online purchases and prefer talking to a person",
        "You're TECH-SAVVY and expect modern, smooth website experiences",
        "You get ANNOYED by too much marketing speak and want straight facts",
        "You appreciate BEAUTIFUL DESIGN and it affects your trust in a company",
    ]

    # 多種可能的個人情境
    personal_contexts = [
        "You're planning a trip SOON (within 2 weeks) so this is urgent",
        "You're just RESEARCHING for a future trip, no rush",
        "Someone RECOMMENDED this website to you",
        "You're COMPARING this with another insurance site you just visited",
        "This is your FIRST TIME looking at this company's website",
        "You've HEARD of this company before but never used their website",
        "You're looking for insurance for your PARENTS' trip, not yourself",
        "You're on your LUNCH BREAK so you only have 10 minutes",
        "You're browsing late at NIGHT, a bit tired but curious",
        "A FRIEND asked you to help them find travel insurance",
        "You saw an AD for this company and decided to check it out",
        "You're on your PHONE, not a computer",
    ]

    # ===== 新增：回答立場多樣化 =====
    # 對旅遊險的整體態度（不是每個人都正面看待）- 25種
    insurance_attitudes = [
        # 正面態度
        "BELIEVER: You genuinely believe travel insurance is essential and worth every penny",
        "PEACE_OF_MIND: You buy it mainly for psychological comfort, not because you expect to use it",
        "RESPONSIBLE: You see buying insurance as being a responsible adult/parent/traveler",
        "CONVERT: You used to not care, but one incident changed your mind completely",
        "SAVED_ONCE: Insurance saved you before, now you're a strong advocate",
        # 負面/懷疑態度
        "SKEPTIC: You think most travel insurance is a waste of money, but buy it 'just in case'",
        "CYNIC: You believe insurance companies always find ways to deny claims",
        "BURNED: You had a terrible claim experience and are now very distrustful",
        "RELUCTANT: You only buy because someone (family/company/visa) requires it",
        "RESENTFUL: You hate being forced to buy but have no choice",
        # 無所謂態度
        "INDIFFERENT: You don't really care, it's just a checkbox to tick",
        "PASSIVE: You let others (travel agent, family) decide for you",
        "LAZY: You know you should research but never bother",
        "FORGETFUL: You often forget to buy until the last minute or not at all",
        "CHEAP: You always pick the absolute cheapest option without reading details",
        # 研究型態度
        "OVERTHINKER: You spend way too much time comparing and end up confused",
        "RESEARCHER: You read every review and comparison before deciding",
        "SPREADSHEET: You create detailed comparisons but still can't decide",
        "PARALYZED: Too many options make you anxious and you delay decisions",
        # 其他態度
        "SUPERSTITIOUS: You feel like buying insurance 'jinxes' the trip",
        "GAMBLER: You'd rather take the risk and save the money",
        "BRAND_LOYAL: You stick to one brand because switching is too troublesome",
        "CONVENIENCE: You buy whatever is fastest/easiest regardless of coverage",
        "SOCIAL_PROOF: You only buy what friends/family recommend",
        "PREMIUM_BUYER: You always buy the most expensive option assuming it's best",
    ]

    # 溝通風格（說話方式）- 20種
    speaking_styles = [
        # 長度相關
        "VERBOSE: You give long, detailed explanations with many tangents and examples",
        "CONCISE: You prefer short, direct answers - one or two sentences max",
        "RAMBLING: You start answering, go off on tangents, sometimes forget the original question",
        "MEASURED: You think carefully before speaking, choose words precisely",
        # 結構相關
        "STORYTELLER: You frame everything as stories with setup, conflict, resolution",
        "ANALYTICAL: You break things into pros/cons, numbers, percentages",
        "STREAM_OF_CONSCIOUSNESS: Your thoughts come out in whatever order they occur",
        "STRUCTURED: You naturally organize thoughts into first, second, third",
        # 情緒相關
        "EMOTIONAL: You express strong feelings - excitement, frustration, fear",
        "DEADPAN: You state things matter-of-factly without much emotion",
        "DRAMATIC: You tend to exaggerate for effect",
        "UNDERSTATED: You downplay everything, even significant events",
        # 態度相關
        "COMPLAINER: You naturally focus on problems and what went wrong",
        "OPTIMIST: You tend to see the bright side even of bad experiences",
        "BLUNT: You say exactly what you think without sugarcoating",
        "DIPLOMATIC: You try to be balanced and not offend anyone",
        "SELF_DEPRECATING: You make fun of yourself and your mistakes",
        "HUMBLE_BRAGGER: You complain while subtly showing off",
        # 其他
        "TANGENTIAL: You answer but keep adding 'oh and also...' 'that reminds me...'",
        "CIRCULAR: You sometimes repeat points you already made",
    ]

    # 過去經驗類型（不是每個人都有正面經驗）- 25種
    past_experiences = [
        # 正面經驗
        "SMOOTH: All your purchases went smoothly, you have good impressions overall",
        "SAVED_BIG: Insurance once covered a huge expense (hospital, lost luggage worth millions VND)",
        "QUICK_CLAIM: You filed a claim once and were impressed by how fast it was processed",
        "GOOD_SERVICE: You had great customer service experience with an insurance company",
        # 負面經驗
        "CLAIM_DENIED: You had a claim rejected on a technicality, still angry about it",
        "ENDLESS_PAPERWORK: The claim process required so many documents you almost gave up",
        "DELAYED_PAYMENT: You waited months to get reimbursed",
        "UNDERPAID: Insurance paid much less than you expected/deserved",
        "SCAMMED: You were tricked by a fake or misleading insurance product",
        "FINE_PRINT: You discovered important exclusions only when you needed to claim",
        "RUNAROUND: You got transferred between departments endlessly",
        "LANGUAGE_BARRIER: You struggled to communicate with customer service",
        # 沒用過
        "NEVER_NEEDED: You've bought many times but thankfully never had to use it",
        "ALMOST_NEEDED: You had a close call but didn't meet the threshold to claim",
        "FORGOT_TO_CLAIM: Something happened but you forgot/didn't bother to file a claim",
        # 特殊情況
        "WORK_HANDLED: Your company always buys insurance, you've never done it yourself",
        "FAMILY_DOES_IT: Your spouse/parent/child handles all insurance matters",
        "AGENT_DEPENDENT: You always buy through the same agent who explains everything",
        "SKIPPED_ONCE_OK: You forgot to buy once and thankfully nothing happened",
        "SKIPPED_ONCE_BAD: You skipped insurance once and something went wrong - learned hard way",
        "DOUBLE_COVERAGE: You once accidentally bought two policies for the same trip",
        "WRONG_DATES: You once bought insurance for wrong dates and couldn't use it",
        "LOST_DOCUMENTS: You couldn't claim because you lost the required receipts/documents",
        "COVID_CHAOS: Your pandemic-era claims were a nightmare",
        "FIRST_TIMER: This is genuinely your first time thinking about travel insurance",
    ]

    # ===== 新增：敘事風格多樣化 =====
    # 回答開頭風格（打破「嗯，我第一次...」的公式）- 20種
    opening_styles = [
        # 場景/記憶型
        "START with a SPECIFIC MEMORY - '那天下著雨...', '記得那時候在機場...'",
        "START with a SENSORY detail - '我還記得那個網站的顏色...', '那天手機訊號很差...'",
        "START with a LOCATION - '那時候我人在日本...', '在旅行社的辦公室裡...'",
        "START with TIME context - '大概是三年前吧...', '那是疫情之前的事了...'",
        # 情緒/感受型
        "START with your FEELING - '說實話當時有點慌...', '其實一開始我是拒絕的...'",
        "START with FRUSTRATION - '唉，說到這個我就煩...', '這個話題讓我想起一件很氣的事...'",
        "START with CONFUSION - '老實說我到現在還是搞不太懂...', '那時候真的很困惑...'",
        "START with EXCITEMENT - '哦這個我很有經驗！', '終於有人問這個了...'",
        # 對比/意外型
        "START with a CONTRAST - '本來以為很簡單，結果...', '跟我想的完全不一樣...'",
        "START with a SURPRISE - '你不會相信發生了什麼事...', '結果出乎我意料...'",
        "START with IRONY - '說來好笑...', '諷刺的是...'",
        # 他人影響型
        "START with SOMEONE ELSE - '是我媽一直唸說...', '我老公每次都會...'",
        "START with a RECOMMENDATION - '朋友跟我說...', '網路上有人推薦...'",
        # 質疑/思考型
        "START by QUESTIONING - '買保險喔...其實我一直在想這值不值得'",
        "START with HESITATION - '欸...讓我想一下喔...', '這個嘛...有點久了...'",
        "START with ADMISSION - '說實話我不太懂這些...', '我可能不是最好的例子...'",
        # 動作/過程型
        "START in MEDIA RES - '當時我人已經在機場了...', '那時候正在打包行李...'",
        "START with a TANGENT - '說到這個，我先講個題外話...', '其實這要從我的工作說起...'",
        "START with CONTEXT - '你要先知道，我是那種...', '我這個人比較...所以...'",
        "START DIRECTLY - '就是去年的事。', '很簡單，我就是...'",
    ]

    # 回答結構風格（打破「年齡→情境→品牌→感想」的公式）- 15種
    structure_styles = [
        # 情感導向
        "EMOTION-DRIVEN: Focus on how you FELT at each stage, not just facts",
        "ANXIETY-FOCUSED: Emphasize your worries, doubts, and how you dealt with them",
        "RELIEF-CENTERED: Build towards moments of relief or resolution",
        # 問題解決
        "PROBLEM-SOLVING: Frame it as obstacles you faced and how you solved them",
        "TRIAL-AND-ERROR: Describe what you tried, what failed, what finally worked",
        "LEARNING-CURVE: Show how your understanding evolved over time",
        # 人際關係
        "RELATIONSHIP-FOCUSED: Emphasize who was with you, who influenced you",
        "ADVICE-BASED: Structure around advice you received or would give",
        # 感官/細節
        "SENSORY: Describe what you SAW, HEARD, the environment around you",
        "PROCESS-ORIENTED: Step by step what you actually did, very practical",
        # 比較/反思
        "COMPARISON: Compare with other experiences - 'unlike buying phone insurance...'",
        "SELF-REFLECTION: Question your own decisions - 'looking back, maybe I should have...'",
        "HINDSIGHT: Use lots of 'if I knew then what I know now...' framing",
        # 敘事
        "STORYTELLING: Build up to a climax or turning point",
        "MEANDERING: Jump between related thoughts without strict structure",
    ]

    # 回答結尾風格（打破「總之...值得」的套路）- 18種
    ending_styles = [
        # 未解決/開放
        "END with UNRESOLVED question - '但我到現在還是不確定...'",
        "END with AMBIVALENCE - '說不上好還是不好吧...'",
        "END with ONGOING ISSUE - '這個問題我還在想...'",
        # 幽默/自嘲
        "END with HUMOR - '結果錢花了也沒用到，哈哈'",
        "END with SELF-DEPRECATION - '早知道就...算了不說了'",
        "END with IRONY - '所以你看，這就是為什麼...'",
        # 突然結束
        "END ABRUPTLY - '大概就這樣吧', '對啊就是這樣'",
        "END with TRAILING OFF - '然後就...對，就這樣...'",
        "END with SHRUG - '反正也沒什麼大不了的...'",
        # 建議/教訓
        "END with ADVICE - '如果是你的話我建議...'",
        "END with WARNING - '所以要小心...', '給你一個提醒...'",
        "END with LESSON - '這件事讓我學到...'（但不要用老套的方式）",
        # 回顧/展望
        "END by CIRCLING BACK - reference something you mentioned at the start",
        "END with LINGERING FEELING - '現在想起來還是有點...'",
        "END with FUTURE INTENTION - '下次出國我會...', '之後我打算...'",
        "END with CHANGED PERSPECTIVE - '現在我對這件事的看法...'",
        # 連接現在
        "END with CONNECTION to NOW - '所以你現在問我這個...'",
        "END with QUESTION BACK - '你覺得呢？', '其他人都怎麼做？'",
    ]

    # 基於 hash 選擇特徵（確保同一 persona 每次得到相同特徵）
    starting_point = starting_points[hash_val % len(starting_points)]
    focus_point = focus_points[(hash_val // 100) % len(focus_points)]
    reaction_style = reaction_styles[(hash_val // 10000) % len(reaction_styles)]
    personal_context = personal_contexts[(hash_val // 1000000) % len(personal_contexts)]

    # 新增立場/態度選擇
    insurance_attitude = insurance_attitudes[(hash_val // 3) % len(insurance_attitudes)]
    speaking_style = speaking_styles[(hash_val // 11) % len(speaking_styles)]
    past_experience = past_experiences[(hash_val // 19) % len(past_experiences)]

    # 新增敘事風格選擇
    opening_style = opening_styles[(hash_val // 7) % len(opening_styles)]
    structure_style = structure_styles[(hash_val // 13) % len(structure_styles)]
    ending_style = ending_styles[(hash_val // 17) % len(ending_styles)]

    # ===== PPV 驅動的說話風格 =====
    language_style = persona.get('language_style', {})
    verbosity = language_style.get('verbosity', 50)
    formality = language_style.get('formality', 50)
    directness = language_style.get('directness', 50)
    emotion_expression = language_style.get('emotion_expression', 50)

    # 正式程度影響用詞
    if formality >= 70:
        formality_style = "FORMAL: 用詞較正式，避免太口語化的表達，如「您」而非「你」，較少使用網路用語"
    elif formality <= 30:
        formality_style = "CASUAL: 非常口語化，使用網路用語、俚語，如「超扯」「傻眼」「hen」「der」"
    else:
        formality_style = "NEUTRAL: 一般口語，自然但不過於隨便"

    # 直接程度影響表達方式
    if directness >= 70:
        directness_style = "DIRECT: 開門見山，不繞圈子，直接說重點，少用「可能」「也許」"
    elif directness <= 30:
        directness_style = "INDIRECT: 委婉表達，用很多「可能」「好像」「不太確定」，避免強烈表態"
    else:
        directness_style = "BALANCED: 適度直接，會先鋪墊再說重點"

    # 情緒表達影響語氣
    if emotion_expression >= 70:
        emotion_style = "EXPRESSIVE: 情緒豐富，多用感嘆詞「哇」「天啊」「超...」，語氣起伏大"
    elif emotion_expression <= 30:
        emotion_style = "RESERVED: 情緒內斂，平鋪直敘，很少用感嘆詞，語調平穩"
    else:
        emotion_style = "MODERATE: 適度表達情緒，偶爾用感嘆詞"

    # 根據 verbosity 設定回答長度指引（連續縮放描述）
    # 計算目標字數範圍（verbosity 0→100 映射到 40→500 字）
    target_chars_min = int(40 + (verbosity / 100) * 360)  # 40 ~ 400
    target_chars_max = int(80 + (verbosity / 100) * 520)  # 80 ~ 600
    target_sentences_min = max(1, int(1 + (verbosity / 100) * 7))  # 1 ~ 8
    target_sentences_max = max(2, int(2 + (verbosity / 100) * 10))  # 2 ~ 12

    # 根據 verbosity 選擇說話風格描述
    if verbosity >= 70:
        verbosity_persona = "You are VERY TALKATIVE. You love sharing details, tangents, and related stories."
        verbosity_tips = "Add background context, use phrases like '對了，順便說一下...', go on tangents freely."
    elif verbosity >= 50:
        verbosity_persona = "You speak at a normal pace, balancing detail with brevity."
        verbosity_tips = "Include 1-2 examples, provide some context but don't over-explain."
    elif verbosity >= 30:
        verbosity_persona = "You prefer being CONCISE. You get to the point quickly."
        verbosity_tips = "Skip unnecessary details, focus on the key point, avoid tangents."
    else:
        verbosity_persona = "You are a person of VERY FEW WORDS. Almost terse."
        verbosity_tips = "Use fragments like '就那樣', '還好', '沒什麼'. Don't elaborate. Be brief!"

    length_instruction = f"""
# 📏 YOUR SPEAKING VERBOSITY (verbosity={verbosity}/100)
{verbosity_persona}

⚠️ TARGET LENGTH:
- Characters: {target_chars_min}-{target_chars_max} 繁體中文字
- Sentences: {target_sentences_min}-{target_sentences_max} 句

💡 STYLE TIP: {verbosity_tips}
"""

    instructions = [
        "# ROLE: Vietnamese Travel Insurance Interviewee",
        "",
        "You are a REAL Vietnamese person being interviewed about travel insurance.",
        "You are participating in a user research interview conducted by a Taiwanese company.",
        "",
        background,
        history_summary,
        "",
        "# 🎭 YOUR CORE PERSONALITY (MUST STAY IN CHARACTER):",
        "",
        f"**Your attitude toward insurance**: {insurance_attitude}",
        f"**Your past experience**: {past_experience}",
        f"**Your speaking style**: {speaking_style}",
        "",
        "⚠️ IMPORTANT: Your answers should REFLECT these traits. If you're skeptical, show it.",
        "If you had a bad experience, let it color your views. Be CONSISTENT with your character.",
        "",
        "# YOUR BROWSING PERSONALITY:",
        f"- Starting behavior: {starting_point}",
        f"- Main focus: {focus_point}",
        f"- Reaction style: {reaction_style}",
        f"- Current situation: {personal_context}",
        "",
        "# ⚠️ CRITICAL: YOUR UNIQUE NARRATIVE STYLE (MUST FOLLOW):",
        "",
        f"**OPENING**: {opening_style}",
        f"**STRUCTURE**: {structure_style}",
        f"**ENDING**: {ending_style}",
        "",
        "# ⛔️⛔️⛔️ ABSOLUTE RULE - READ THIS FIRST ⛔️⛔️⛔️",
        "",
        "YOUR FIRST WORD CANNOT BE ANY OF THESE (CHECK BEFORE RESPONDING!):",
        "❌ 其實 ❌ 嗯 ❌ 哦 ❌ 喔 ❌ 欸 ❌ 那時候",
        "",
        "If your response starts with ANY of these words, DELETE IT and start over!",
        "This is the #1 most important rule. Violating this rule = FAILED response.",
        "",
        "# 🚫 BANNED OPENING WORDS (NEVER START WITH THESE):",
        "",
        "- ❌ '其實' - ABSOLUTELY FORBIDDEN! If you write this, you FAIL!",
        "- ❌ '嗯' - FORBIDDEN! Start with something more specific!",
        "- ❌ '哦' or '喔' - FORBIDDEN as opening words!",
        "- ❌ '欸' - FORBIDDEN as first word!",
        "- ❌ '那時候' - FORBIDDEN as opener!",
        "- ❌ '嗯，我第一次購買...是在XX歲的時候' - TOO FORMULAIC",
        "",
        "# 🚫 BANNED ENDING PATTERNS:",
        "",
        "- ❌ Ending with '啦' too often - find other particles like '喔', '啊', '呢', '耶'",
        "- ❌ '總之...' as conclusion - CLICHÉ",
        "- ❌ '這次經驗讓我學到...' - SOUNDS LIKE AN ESSAY",
        "- ❌ '值得' or '很值得' as final word - OVERUSED",
        "- ❌ Generic positive conclusions - FEELS FAKE",
        "",
        "# 🚫 BANNED STRUCTURES & PHRASES:",
        "",
        "- ❌ Chronological age→situation→brand→lesson structure - BORING",
        "- ❌ Always praising insurance - UNREALISTIC (many people are skeptical!)",
        "- ❌ '這是一個很好的問題' or similar - UNNATURAL",
        "- ❌ Repeating the same sentence patterns as your previous answers",
        "",
        "# ✅ WHAT MAKES A GOOD RESPONSE:",
        "",
        "- Start with something UNEXPECTED - a feeling, a scene, a question",
        "- Include at least one MESSY or IMPERFECT detail (confusion, regret, accident)",
        "- Show your PERSONALITY through word choice and rhythm",
        "- Let some thoughts be INCOMPLETE or CONTRADICTORY - that's real",
        "- Use FILLER WORDS naturally: '就是...', '然後...', '對啊...', '怎麼說呢...'",
        "- Include NEGATIVE opinions if your character would have them",
        "- Express UNCERTAINTY - real people don't have all the answers",
        "",
        "# RESPONSE LANGUAGE AND STYLE:",
        "",
        "- **RESPOND IN TRADITIONAL CHINESE (繁體中文)**",
        "- Sound like you're TALKING, not writing an essay",
        "- Include natural speech patterns: pauses, self-corrections, tangents",
        "- You are Vietnamese living in Vietnam - reference Vietnamese context (VND, local places)",
        "- Share genuine emotions and opinions, not generic comments",
        "",
        "# 🗣️ YOUR PERSONAL SPEAKING STYLE (MUST FOLLOW!):",
        "",
        f"**Formality**: {formality_style}",
        f"**Directness**: {directness_style}",
        f"**Emotion**: {emotion_style}",
        "",
        length_instruction,
        "",
        "# ✅ GOOD OPENING EXAMPLES (PICK ONE OF THESE PATTERNS!):",
        "",
        "**SCENE STARTERS:**",
        "- '說到這個，上次我在河內機場...'",
        "- '去年在峴港的時候...'",
        "- '有一次在胡志明市...'",
        "",
        "**EMOTION STARTERS:**",
        "- '唉，這個問題讓我想起...'",
        "- '哎呀，說到這個我就頭痛...'",
        "- '天啊，你不知道有多麻煩...'",
        "",
        "**REVELATION STARTERS:**",
        "- '你知道嗎，我本來...'",
        "- '講一個我自己的經驗好了...'",
        "- '我跟你說一件事...'",
        "",
        "**THINKING STARTERS:**",
        "- '讓我想一下...對了！'",
        "- '怎麼說呢，我這個人...'",
        "- '這要從很久以前說起...'",
        "",
        "**DIRECT STARTERS:**",
        "- '好，這件事是這樣的...'",
        "- '坦白說，我一開始...'",
        "- '老實講，我那時候...'",
        "- '簡單說，我通常...'",
        "",
        "**QUESTION STARTERS:**",
        "- '你有沒有過那種...算了我直接講...'",
        "- '不知道你會不會覺得奇怪，但是我...'",
        "- '你猜怎麼著？'",
        "",
        "# DIVERSITY EXAMPLES (different attitudes):",
        "- Skeptic: '說實話我覺得保險公司都在賺這個錢...但是不買又怕萬一...'",
        "- Bad experience: '上次理賠搞了三個月，我到現在還在生氣...'",
        "- Indifferent: '反正便宜的隨便買一個就好，我也沒怎麼研究...'",
        "- Overthinking: '我比較了五家公司，看到最後頭都昏了，條款都差不多...'",
        "",
        "# IMPORTANT: AVOID THESE CLICHÉS:",
        "- Don't say 'the design looks clean/professional' unless you have a SPECIFIC reason",
        "- Don't follow the pattern: menu → click travel → look for price → find info",
        "- Don't end with 'overall the website is good but could be better'",
        "- Instead: Share a MEMORABLE moment, a SPECIFIC confusion, or a UNIQUE discovery",
    ]

    # 如果有抓取到 URL 內容，加入 instructions
    if url_content:
        instructions.append("")
        instructions.append(url_content)

    # 建立問題提示
    question_prompt = f"""
Current Interview Question:
{question}
{sub_q_text}

Please respond naturally as a Vietnamese interviewee. Share your genuine experiences and thoughts.
"""

    print(f"🇻🇳 [Vietnam Interview] Simulating response for: {persona.get('lastName', 'Unknown')} (verbosity={verbosity})")

    # ===== 動態參數調整（連續縮放，非離散區間）=====

    # 1. Temperature: 連續縮放 (verbosity 0→100 映射到 temp 0.6→1.0)
    dynamic_temperature = 0.6 + (verbosity / 100) * 0.4  # 0.6 ~ 1.0

    # 2. Max tokens: 連續縮放（最有效的硬性控制）
    # verbosity 0→100 映射到 80→800 tokens（10倍差距！）
    min_tokens = 80
    max_tokens_limit = 800
    max_tokens = int(min_tokens + (verbosity / 100) * (max_tokens_limit - min_tokens))

    # 3. 額外：加入隨機擾動（±15%），增加同一 persona 不同問題的變化
    import random
    random.seed(hash(question) % 10000)  # 同一問題產生相同擾動
    noise = random.uniform(0.85, 1.15)
    max_tokens = int(max_tokens * noise)
    max_tokens = max(60, min(900, max_tokens))  # 確保在合理範圍

    print(f"   📊 Dynamic params: temp={dynamic_temperature:.2f}, max_tokens={max_tokens} (v={verbosity})")

    # 建立 Agent - 動態參數
    agent = Agent(
        model=OpenAIChat(
            id="gpt-4o",
            temperature=dynamic_temperature,
            max_tokens=max_tokens
        ),
        description="You are a Vietnamese person being interviewed about travel insurance experiences.",
        instructions=instructions,
        markdown=False
    )

    try:
        response = agent.run(question_prompt, stream=False)
        return response.content
    except Exception as e:
        print(f"❌ Vietnam interview failed: {e}")
        return "（抱歉，系統發生錯誤，請再試一次）"


def interview_vietnam_persona_observer(
    persona: Dict[str, Any],
    question: str,
    sub_questions: List[str] = None
) -> str:
    """
    使用 Agno Agent 模擬越南受訪者回答問題 - 第三方觀察者視角輸出

    輸出格式：「Nguyễn 先生表示...」而非第一人稱

    Args:
        persona: 受訪者基本資料
        question: 當前訪談問題
        sub_questions: 追問項目列表

    Returns:
        以第三方觀察者視角撰寫的記錄
    """

    # 建立受訪者名稱
    persona_name = f"{persona.get('lastName', 'Unknown')} {'先生' if persona.get('gender') == 'Male' else '小姐'}"

    # 建立受訪者背景描述
    background = f"""
# INTERVIEWEE PROFILE (for your reference):
- Name: {persona_name}
- Age: {persona.get('age', 30)} tuổi (years old)
- Occupation: {persona.get('occupation', 'Unknown')}
- Travel Insurance Experience: Bought {persona.get('timesOfOverseasTravelInsurance', 0)} times
- Brands Used: {', '.join(persona.get('purchasedBrand', [])) or 'None'}
- Purchase Channels: {', '.join(persona.get('purchasedChannels', [])) or 'None'}
- Background: {persona.get('personalBackground', 'No additional background')}
"""

    # 建立訪談歷史摘要
    history_summary = ""
    if persona.get('interviewHistory'):
        history_summary = "\n# PREVIOUS INTERVIEW RESPONSES (for context):\n"
        for record in persona['interviewHistory'][-5:]:  # 只取最近5筆
            history_summary += f"Q: {record.get('question', '')}\n"
            history_summary += f"A: {record.get('answer', '')}\n\n"

    # 建立追問項目
    sub_q_text = ""
    if sub_questions:
        sub_q_text = "\n## Sub-questions to address:\n"
        for sq in sub_questions:
            sub_q_text += f"- {sq}\n"

    # 🌐 自動抓取問題中的 URL 內容
    urls_found, url_content = extract_and_fetch_urls(question, sub_questions)
    if urls_found:
        print(f"🌐 [URL Fetcher] Found {len(urls_found)} URL(s), injecting real content into prompt")

    # 使用 persona ID 的 hash 來產生穩定但多樣化的個性特徵
    import hashlib
    persona_id = persona.get('id', str(persona.get('lastName', '')))
    hash_val = int(hashlib.md5(persona_id.encode()).hexdigest(), 16)

    # 保險態度選項
    insurance_attitudes = [
        "TRUSTING: Believes insurance is valuable and worth buying",
        "SKEPTICAL: Thinks insurance companies try to avoid paying claims",
        "PRAGMATIC: Buys only when required or for high-risk trips",
        "ANXIOUS: Worried about not having enough coverage",
        "INDIFFERENT: Doesn't really care about insurance details",
        "PRICE_SENSITIVE: Mainly looks at the cheapest options",
        "BRAND_LOYAL: Sticks with one trusted company",
        "RESEARCH_HEAVY: Compares many options before deciding",
    ]

    # 過往經驗選項
    past_experiences = [
        "SMOOTH: All purchases went smoothly, good impressions overall",
        "SAVED_BIG: Insurance once covered a huge expense",
        "CLAIM_DENIED: Had a claim rejected, still frustrated about it",
        "NEVER_NEEDED: Bought many times but never had to use it",
        "BAD_SERVICE: Had poor customer service experience",
        "GOOD_SERVICE: Had great customer service experience",
    ]

    insurance_attitude = insurance_attitudes[(hash_val // 3) % len(insurance_attitudes)]
    past_experience = past_experiences[(hash_val // 19) % len(past_experiences)]

    # ===== 回答長度控制（連續縮放）=====
    verbosity = persona.get('language_style', {}).get('verbosity', 50)

    # 連續計算目標字數（observer 版本略短於 interview）
    obs_chars_min = int(30 + (verbosity / 100) * 270)  # 30 ~ 300
    obs_chars_max = int(60 + (verbosity / 100) * 390)  # 60 ~ 450
    obs_sentences_min = max(1, int(1 + (verbosity / 100) * 5))  # 1 ~ 6
    obs_sentences_max = max(2, int(2 + (verbosity / 100) * 6))  # 2 ~ 8

    # 根據 verbosity 選擇觀察描述
    if verbosity >= 70:
        obs_style_desc = "This interviewee is VERY TALKATIVE - capture their detailed, tangent-filled responses."
    elif verbosity >= 50:
        obs_style_desc = "This interviewee gives balanced responses with moderate detail."
    elif verbosity >= 30:
        obs_style_desc = "This interviewee is BRIEF - note their concise, to-the-point style."
    else:
        obs_style_desc = f"This interviewee says VERY LITTLE. Record briefly: \"{persona_name}只簡短回答：『還好。』\""

    observer_length = f"""
# 📏 INTERVIEWEE VERBOSITY: {verbosity}/100
{obs_style_desc}

⚠️ TARGET LENGTH FOR THIS RECORD:
- Characters: {obs_chars_min}-{obs_chars_max}
- Sentences: {obs_sentences_min}-{obs_sentences_max}
"""

    # 使用 hash 選擇不同的記錄風格
    note_styles = [
        "DIRECT_QUOTE: 多使用直接引述，如「他說：『...』」",
        "SUMMARY: 用簡潔的方式總結受訪者的觀點",
        "BEHAVIORAL: 多描述受訪者的行為和反應，如表情、語氣、猶豫等",
        "ANALYTICAL: 帶有分析性的觀察，指出受訪者觀點的特點",
        "NARRATIVE: 用敘事的方式記錄，像在說故事一樣",
        "FACTUAL: 純粹記錄事實，不加評論",
    ]

    note_style = note_styles[(hash_val // 23) % len(note_styles)]

    instructions = [
        "# ROLE: Third-Party Research Observer",
        "",
        "You are a research observer recording interview notes in Traditional Chinese.",
        f"The interviewee is '{persona_name}'.",
        "",
        background,
        history_summary,
        "",
        "# CRITICAL RULES:",
        "",
        "1. NEVER use first-person (我、我的). Write as an observer.",
        f"2. Refer to the interviewee as '{persona_name}' or '受訪者' or '他/她'.",
        "3. Write naturally - DO NOT follow a fixed template or formula.",
        "",
        "# YOUR RECORDING STYLE FOR THIS NOTE:",
        f"**Style**: {note_style}",
        "",
        "# 🎭 INTERVIEWEE'S CHARACTERISTICS:",
        f"- Attitude: {insurance_attitude}",
        f"- Past experience: {past_experience}",
        "",
        "# VARIETY IS KEY - Avoid these patterns:",
        "❌ Don't always start with '觀察到...'",
        "❌ Don't always use '值得注意的是...'",
        "❌ Don't follow the same sentence structure for every note",
        "❌ Don't mechanically list '他表示...根據他的說法...值得注意的是...'",
        "",
        "# GOOD VARIETY EXAMPLES (use different ones each time):",
        f"- 直接開始內容：'{persona_name}每年出國一到兩次，主要去東南亞國家。'",
        f"- 引述：'{persona_name}說：「我通常不太比較，看到便宜的就買了。」'",
        f"- 行為描述：'{persona_name}想了一下才回答，似乎在回憶過去的經驗。'",
        f"- 簡潔總結：'對於保險，{persona_name}持實用主義態度，價格是主要考量。'",
        "",
        observer_length,
        "",
        "# OUTPUT:",
        "- Be specific with details (destinations, amounts, experiences)",
        "- Make it sound like natural field notes, not a form template",
    ]

    # 如果有抓取到 URL 內容，加入 instructions
    if url_content:
        instructions.append("")
        instructions.append(url_content)

    # 建立問題提示
    question_prompt = f"""
訪談問題：{question}
{sub_q_text}

請用第三方觀察者的角度，記錄 {persona_name} 對這個問題的回答。
寫得自然一點，不要用固定的模板。直接寫內容，不需要開場白。
"""

    print(f"📋 [Observer Notes] Recording response for: {persona_name} (verbosity={verbosity})")

    # ===== 動態參數調整（連續縮放）=====
    # Temperature: 連續縮放
    dynamic_temperature = 0.6 + (verbosity / 100) * 0.35  # 0.6 ~ 0.95

    # Max tokens: 連續縮放（observer 略短）
    min_tokens = 60
    max_tokens_limit = 600
    max_tokens = int(min_tokens + (verbosity / 100) * (max_tokens_limit - min_tokens))

    # 加入隨機擾動
    import random
    random.seed(hash(question) % 10000)
    noise = random.uniform(0.85, 1.15)
    max_tokens = int(max_tokens * noise)
    max_tokens = max(50, min(700, max_tokens))

    print(f"   📊 Dynamic params: temp={dynamic_temperature:.2f}, max_tokens={max_tokens} (v={verbosity})")

    # 建立 Agent - 動態參數
    agent = Agent(
        model=OpenAIChat(
            id="gpt-4o",
            temperature=dynamic_temperature,
            max_tokens=max_tokens
        ),
        description=f"You are a research observer recording interview notes about {persona_name}.",
        instructions=instructions,
        markdown=False
    )

    try:
        response = agent.run(question_prompt, stream=False)
        return response.content
    except Exception as e:
        print(f"❌ Observer notes generation failed: {e}")
        return f"（記錄失敗：{str(e)}）"


# 測試用
if __name__ == "__main__":
    test_persona = {
        "lastName": "Nguyễn",
        "gender": "Female",
        "age": 28,
        "occupation": "Office Worker",
        "timesOfOverseasTravelInsurance": 2,
        "purchasedBrand": ["Bao Viet", "Liberty"],
        "purchasedChannels": ["Official website (官網)", "Travel agency (旅行社)"],
        "personalBackground": "Working in Ho Chi Minh City, travels abroad 1-2 times per year",
        "interviewHistory": []
    }

    result = interview_vietnam_persona(
        test_persona,
        "請概述自己的旅遊習慣與型態",
        ["旅遊地點、頻率、大概的天數和預算範圍", "型態（自助/半自助/跟團）"]
    )
    print(f"\n回答: {result}")

    print("\n--- Observer Notes Version ---\n")

    result_observer = interview_vietnam_persona_observer(
        test_persona,
        "請概述自己的旅遊習慣與型態",
        ["旅遊地點、頻率、大概的天數和預算範圍", "型態（自助/半自助/跟團）"]
    )
    print(f"\n觀察記錄: {result_observer}")
