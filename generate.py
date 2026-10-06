#!/usr/bin/env python3
import os
import re
import json
import random
import datetime
import requests
import sys
import time

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "REDACTED")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
SITE_URL = "https://veyrost.is-a.dev"
SITE_PATH = os.path.expanduser("~/Veyrost")
QUALITY_THRESHOLD = 80
MAX_RETRIES = 5

def call_deepseek(system_prompt, user_prompt, json_mode=True):
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    r = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=180)
    r.raise_for_status()
    content = r.json()["choices"][0]["message"]["content"]
    return json.loads(content) if json_mode else content

def discover_hypothesis():
    sys_prompt = """You are an advanced AI Prompt Engineer and Researcher. 
Propose an ADVANCED, UNCONVENTIONAL, or NOVEL AI prompting trick/workflow (e.g., Chain-of-Verification, System-Role Inversion, Multi-agent Logic Injection) that solves a real business, coding, or logic problem.

Return ONLY JSON:
{
    "topic_title": "Title of the prompt technique",
    "hypothesis": "What issue this trick solves and why it produces superior results",
    "test_prompt": "The EXACT specialized prompt to test without any placeholders like [INSERT]. Make it completely runnable with a concrete scenario.",
    "baseline_prompt": "The standard simple prompt to compare against with the same concrete scenario."
}"""
    return call_deepseek(sys_prompt, "Generate a novel high-value AI prompting technique to experiment with.")

def test_hypothesis(hypothesis_data):
    test_prompt = hypothesis_data["test_prompt"]
    baseline_prompt = hypothesis_data["baseline_prompt"]

    print("   🧪 Санҷиши амалии промпти оддӣ...")
    baseline_out = call_deepseek("You are a helpful assistant.", baseline_prompt, json_mode=False)

    print("   🔬 Санҷиши амалии трюки нав...")
    tested_out = call_deepseek("You are an execution engine.", test_prompt, json_mode=False)

    return {
        "baseline_output": baseline_out,
        "tested_output": tested_out
    }

def analyze_results(hypothesis_data, test_results):
    sys_prompt = """You are a strict AI Quality Auditor. Evaluate the test output of a proposed prompt trick.
Rate the quality from 0 to 100 based on:
1. Reality/Validity: Did the tested prompt significantly outperform the baseline?
2. Practical Value: Is this actually useful for professionals/creators?
3. Novelty: Is this a unique non-obvious technique?

Return ONLY JSON:
{
    "score": 85,
    "approved": true,
    "analysis_summary": "Detailed technical analysis of the output comparison.",
    "key_benefits": ["benefit 1", "benefit 2"]
}"""

    user_payload = f"""Technique: {hypothesis_data['topic_title']}
Hypothesis: {hypothesis_data['hypothesis']}
Tested Prompt: {hypothesis_data['test_prompt']}

Baseline Output:
{test_results['baseline_output'][:800]}

Tested Output:
{test_results['tested_output'][:800]}"""

    return call_deepseek(sys_prompt, user_payload)

def generate_verified_article(hypothesis_data, test_results, analysis_data):
    sys_prompt = """You are a technical blogger for VEYROST. Write an in-depth, practical article about an AI prompt technique THAT WAS JUST TESTED AND VERIFIED.

Return ONLY JSON:
{
  "en": {
    "title": "Short catchy title in English",
    "slug": "url-friendly-slug-en",
    "excerpt": "Summary in English",
    "body_html": "<p>...</p><h2>The Practical Prompt</h2><pre><code>...</code></pre><h2>Test Results & Proof</h2><p>...</p>"
  },
  "ru": {
    "title": "Заголовок на русском",
    "slug": "url-friendly-slug-ru",
    "excerpt": "Выжимка на русском",
    "body_html": "<p>...</p><h2>Практический промпт</h2><pre><code>...</code></pre><h2>Результаты теста</h2><p>...</p>"
  }
}

Rules for body_html:
- 600-800 words
- Must include the EXACT tested prompt inside <pre><code> tags
- Explain WHY it works using the provided analysis
- Tags allowed: <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>, <code>, <pre>
- NO <html>, <body>, <h1> tags"""

    user_payload = f"""Technique Data: {json.dumps(hypothesis_data)}
Analysis Results: {json.dumps(analysis_data)}
Verified Output Sample: {test_results['tested_output'][:600]}"""

    return call_deepseek(sys_prompt, user_payload)

def generate_banner(topic, slug):
    img_name = f"banner-{slug[:40]}.jpg"
    img_dir = os.path.join(SITE_PATH, "posts")
    os.makedirs(img_dir, exist_ok=True)
    img_path = os.path.join(img_dir, img_name)

    short_prompt = re.sub(r'[^a-zA-Z0-9 ]', '', topic)[:50]
    prompt = f"Futuristic technology banner about AI: {short_prompt}. Minimalist clean 16:9"
    from urllib.parse import quote
    encoded = quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=1200&height=675&nologo=true&seed={random.randint(1, 999999)}"

    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        with open(img_path, "wb") as f:
            f.write(r.content)
    except Exception as e:
        print(f"⚠️ Сервери тасвир ҷавоб надод, истифодаи баннери заҳиравӣ: {e}")
        fallback_url = "https://picsum.photos/1200/675"
        try:
            r = requests.get(fallback_url, timeout=30)
            with open(img_path, "wb") as f:
                f.write(r.content)
        except Exception:
            pass
    return img_name

def make_html(lang, post, banner_name, date_str):
    title = post["title"]
    excerpt = post["excerpt"]
    body = post["body_html"]

    if lang == "en":
        back = "← Back to home"
        back_url = "/index.html"
        other = "Русская версия"
        other_url = f"../posts/{post['slug']}-ru.html"
        lang_attr = "en"
        date_label = "Verified & Published"
    else:
        back = "← На главную"
        back_url = "/index.html"
        other = "English version"
        other_url = f"../posts/{post['slug']}-en.html"
        lang_attr = "ru"
        date_label = "Проверено и опубликовано"

    return f"""<!DOCTYPE html>
<html lang="{lang_attr}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — VEYROST Lab</title>
<meta name="description" content="{excerpt}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{SITE_URL}/posts/{post['slug']}-{lang}.html">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 780px; margin: 0 auto; padding: 24px; line-height: 1.7; color: #1a1a2e; background: #fafafa; }}
  h1 {{ font-size: 2.1rem; line-height: 1.25; margin: 24px 0 8px; color: #0f172a; }}
  h2 {{ margin-top: 36px; font-size: 1.4rem; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }}
  pre {{ background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.9rem; }}
  code {{ font-family: monospace; }}
  img.banner {{ width: 100%; border-radius: 14px; margin-bottom: 16px; }}
  .meta {{ color: #10b981; font-weight: 600; font-size: 0.9rem; margin-bottom: 24px; }}
  .back {{ display: inline-block; margin-bottom: 16px; color: #2563eb; text-decoration: none; font-weight: 600; }}
  .other {{ display: inline-block; margin-top: 40px; padding: 10px 18px; background: #2563eb; color: #fff; border-radius: 8px; text-decoration: none; }}
  footer {{ margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.85rem; }}
</style>
</head>
<body>
<a class="back" href="{back_url}">{back}</a>
<img class="banner" src="../posts/{banner_name}" alt="{title}">
<h1>{title}</h1>
<p class="meta">✓ {date_label}: {date_str} · VEYROST AI Lab</p>
<article>
{body}
</article>
<a class="other" href="{other_url}">{other}</a>
<footer>© VEYROST — Independent AI Technology Project by Khayom Abdurahmonov</footer>
</body>
</html>"""

def update_sitemap(new_posts):
    sitemap_path = os.path.join(SITE_PATH, "sitemap.xml")
    today = datetime.date.today().isoformat()

    if not os.path.exists(sitemap_path):
        with open(sitemap_path, "w", encoding="utf-8") as f:
            f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>')

    with open(sitemap_path, "r", encoding="utf-8") as f:
        content = f.read()

    new_entries = ""
    for slug, lang in new_posts:
        new_entries += f"""  <url>
    <loc>{SITE_URL}/posts/{slug}-{lang}.html</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n"""

    content = content.replace("</urlset>", new_entries + "</urlset>")
    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write(content)

def main():
    print("🚀 Оғози раванди тавлид ва санҷиши контент...")

    for attempt in range(1, MAX_RETRIES + 1):
        print(f"\n--- Кӯшиши {attempt}/{MAX_RETRIES} ---")

        print("💡 Модули 1: Тӯли гипотеза ва промпти нав...")
        hypothesis = discover_hypothesis()
        print(f"📌 Мавзӯъ: {hypothesis['topic_title']}")

        print("⚡ Модули 2: Санҷиши амалӣ дар API...")
        test_results = test_hypothesis(hypothesis)

        print("📊 Модули 3: Таҳлили дақиқии натиҷаҳо...")
        analysis = analyze_results(hypothesis, test_results)
        score = analysis.get("score", 0)
        approved = analysis.get("approved", False)

        print(f"📈 Баҳои сифат: {score}/100 | Тасдиқ: {approved}")

        if approved and score >= QUALITY_THRESHOLD:
            print("✅ Идея аз санҷиши сифат гузашт! Гузариш ба марҳилаи нашр...")

            print("✍️ Модули 4: Навиштани мақолаи тасдиқшуда (EN & RU)...")
            article_data = generate_verified_article(hypothesis, test_results, analysis)

            en = article_data["en"]
            ru = article_data["ru"]

            en["slug"] = re.sub(r"[^a-z0-9-]", "", en["slug"].lower().replace(" ", "-"))[:50]
            ru["slug"] = re.sub(r"[^a-z0-9-]", "", ru["slug"].lower().replace(" ", "-"))[:50]

            today = datetime.date.today().isoformat()

            print("🎨 Модули 5: Сохтани баннер ва файлҳои HTML...")
            banner_name = generate_banner(en["title"], en["slug"])

            en_html = make_html("en", en, banner_name, today)
            ru_html = make_html("ru", ru, banner_name, today)

            with open(os.path.join(SITE_PATH, "posts", f"{en['slug']}-en.html"), "w", encoding="utf-8") as f:
                f.write(en_html)

            with open(os.path.join(SITE_PATH, "posts", f"{ru['slug']}-ru.html"), "w", encoding="utf-8") as f:
                f.write(ru_html)

            update_sitemap([(en['slug'], "en"), (ru['slug'], "ru")])

            print("📤 Ирсол ба GitHub...")
            post_title = en['title'][:40]
            os.system(f'cd {SITE_PATH} && git add . && git commit -m "Verified Post: {post_title}" && git push')
            print("🎉 Мақола бо муваффақият санҷида шуд ва нашр гардид!")
            return
        else:
            print(f"❌ Идея рад шуд (Баҳо: {score}). Сабаб: {analysis.get('analysis_summary', '')}")
            time.sleep(2)

    print("⚠️ Баъди чанд кӯшиш контенти ба талабот ҷавобгӯ пайдо нашуд.")

if __name__ == "__main__":
    main()
