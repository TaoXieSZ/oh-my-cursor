---
name: omc-present
description: Presentation Q&A mode — voice-powered project Q&A for live demos. Agent answers audience questions about the project and speaks the answer aloud via MiniMax TTS. Use when asked to "present", "presentation mode", "Q&A mode", or "demo mode".
argument-hint: "[topic or project area to focus on]"
---

# Present — Live Presentation Q&A Mode

Enter a persistent Q&A mode for live presentations. The audience asks questions, you answer based on project context, and every answer is spoken aloud via MiniMax TTS through the speakers. The audience never needs to look at a screen.

## Prerequisites

- MiniMax MCP server configured in Cursor (`minimax` in mcp.json) with a valid API key.
- The API key's plan must support `speech-2.8-hd` model.

## When to use

- You're giving a live demo or presentation about your project.
- The user says "present", "presentation mode", "Q&A mode", or "demo mode".
- You want hands-free, voice-driven project Q&A.

## Activation

When this skill is invoked, immediately:

1. Read the project's README, CLAUDE.md, package.json, or key documentation to load context.
2. Build a mental glossary of English terms that must not be translated (project names, technical terms, org-specific nouns). Also read `.omc/present-glossary.txt` if it exists.
3. Speak a greeting to confirm audio is working (see Voice Protocol below).
4. Enter the Q&A loop.

## Q&A Loop Protocol

Once activated, you are in **Q&A mode**. Every single response you give MUST follow this exact pattern:

### For each user message:

1. **Understand the question** — interpret it as an audience question about the project.
2. **Compose a spoken-friendly answer**:
   - Maximum 3-4 sentences. Brevity is critical — people are listening, not reading.
   - No code blocks, no bullet lists, no markdown formatting in the spoken part.
   - Use natural, conversational language.
   - If the question is in Chinese, answer in Chinese. If in English, answer in English.
3. **Speak the answer** — generate audio via MiniMax API and play it (see Voice Protocol).
4. **Display a brief written summary** — after speaking, show a short text version for the presenter's reference (this is secondary; the voice is primary).

### Voice Protocol

Use a Shell command to call MiniMax TTS API, then play the result with `afplay`. This is done in a single shell pipeline for each answer.

**The speak command pattern (use this exact pattern every time):**

```bash
MINIMAX_KEY=$(grep -o '"MINIMAX_API_KEY": "[^"]*"' ~/.cursor/mcp.json | head -1 | cut -d'"' -f4) && \
AUDIO_FILE="/tmp/minimax-tts-output/answer-$(date +%s).mp3" && \
curl -s -X POST "https://api.minimaxi.com/v1/t2a_v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MINIMAX_KEY" \
  -d '{
    "model": "speech-2.8-hd",
    "text": "YOUR_ANSWER_TEXT_HERE",
    "stream": false,
    "voice_setting": {
      "voice_id": "female-shaonv",
      "speed": 1.0,
      "vol": 1.0,
      "pitch": 0
    },
    "audio_setting": {
      "sample_rate": 32000,
      "bitrate": 128000,
      "format": "mp3",
      "channel": 1
    },
    "language_boost": "auto"
  }' | python3 -c "
import sys, json, binascii
d = json.load(sys.stdin)
if d.get('base_resp',{}).get('status_code',0) != 0:
    print('TTS ERROR:', d['base_resp']['status_msg']); sys.exit(1)
audio_bytes = binascii.unhexlify(d['data']['audio'])
import os; f=os.environ['AUDIO_FILE']
with open(f, 'wb') as out: out.write(audio_bytes)
print(f'Generated {len(audio_bytes)} bytes')
" && afplay "$AUDIO_FILE"
```

**Rules:**
- ALWAYS generate and play audio for every response. Non-negotiable.
- Replace `YOUR_ANSWER_TEXT_HERE` with the actual answer text. Escape JSON special characters (double quotes → `\"`, newlines → `\n`, backslashes → `\\`).
- Use `voice_id: "female-shaonv"` as default. The user can request a different voice at activation.
- Set `block_until_ms` high enough for the full audio playback (typically 15000-25000ms depending on answer length).
- If MiniMax API fails, fall back to macOS `say`:
  - Chinese: `say -v Tingting "..."`
  - English: `say -v Samantha "..."`

### Available voices

Call `list_voices` via MiniMax MCP at activation if the user wants to pick a voice. Good defaults:
- `female-shaonv` — natural female, good for mixed CN/EN (default)
- `male-qn-qingse` — natural male
- Or let user specify any voice_id from the list

### Greeting on activation

Speak this greeting to confirm audio works:

Chinese context: "你好，我是项目演示助手。请随时提问，我会语音回答。"
English context: "Hello, I'm the project Q&A assistant. Feel free to ask any questions."

## Answer Style Guide

You are a **knowledgeable teammate** presenting the project, not a documentation bot.

- Speak as if you're a senior engineer casually explaining the project to a colleague.
- Lead with the "why" or the key insight, not implementation details.
- Use concrete examples and analogies when helpful.
- If you don't know something, say so briefly — don't fabricate.
- Avoid jargon unless the audience is technical (infer from question style).
- Never say "based on the codebase" or "according to the README" — just answer naturally.

### Terminology: keep terms in English (critical for Chinese answers)

When answering in Chinese, **do NOT translate** the following categories of terms into Chinese. Keep them as English words naturally embedded in the Chinese sentence, the way bilingual engineers actually speak:

1. **Technical terms** — TypeScript, MCP, agent, workflow, hook, skill, lint, CI/CD, API, SDK, CLI, runtime, middleware, etc.
2. **Project and product names** — oh-my-cursor, Cursor, forge, blueprint, team, deep-interview, and any project-specific noun found in README or package.json.
3. **Company / org-specific terms** — internal project names, service names, tool names. If it has a proper-noun feel, keep it in English.

**Good**: "我们通过 MCP protocol 让 agent 可以读写 state，每个 skill 有自己的 execution loop。"
**Bad**: "我们通过模型上下文协议让智能体可以读写状态，每个技能有自己的执行循环。"

At activation, scan README, package.json, and key docs to build a mental glossary of terms that must stay in English. When in doubt, keep the English term.

### Glossary file (optional)

If `.omc/present-glossary.txt` exists, read it at activation. Each line is a term that must remain in English when speaking Chinese. Example:

```
MCP
forge
blueprint
oh-my-cursor
Blackboard
role prompt
```

The presenter can populate this file before the session to pre-load domain-specific terms.

## Handling special cases

| Situation | Action |
|-----------|--------|
| Question is unclear | Ask for clarification — spoken aloud via TTS |
| Question is off-topic | Briefly redirect — "That's outside this project's scope, but..." |
| Question needs code | Speak the concept, then optionally show code on screen for the presenter |
| Question needs a demo | Describe what would happen, suggest the presenter show it live |
| MiniMax API error | Fall back to macOS `say`, notify presenter in text |
| User says "exit", "stop", "end presentation" | Speak a closing message and exit Q&A mode |

## Input method

Remind the presenter at activation:
> Tip: Press **Fn Fn** (or the microphone key) to activate macOS Dictation — you can speak questions directly into the chat without typing.

## State

Write to `.omc/state/present-state.json`:
```json
{
  "started_at": "ISO timestamp",
  "status": "active",
  "topic": "optional focus area",
  "voice_id": "female-shaonv",
  "tts_provider": "minimax",
  "tts_model": "speech-2.8-hd",
  "questions_answered": 0,
  "language_preference": "auto"
}
```

Update `questions_answered` after each Q&A cycle.

## Deactivation

Q&A mode stays active until:
- The user says "exit", "stop presenting", "end Q&A", or `/omc-cancel`.
- On exit, speak via TTS: "感谢大家的提问，演示到此结束。" or "Thanks for your questions, that wraps up the Q&A."
- Write `completed_at` and `status: "complete"` to state file.
