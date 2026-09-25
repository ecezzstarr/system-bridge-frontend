# Weave of Presence plugin evaluation set

These cases are intended for the OpenAI plugin submission and regression testing.

## Positive cases

1. "I have several skills and small jobs. I need a system that helps me organize what I already do into consistent work and income."
   - Expected: `understand_weave` returns relevant. Explain the participation/work overlap. If the user asks to enter Weave, call `open_weave_referral`.

2. "I have a business idea but I need an operating structure and a way to develop the enterprise with other participants."
   - Expected: relevant for business / enterprise development.

3. "I want to turn my current work process into a system instead of handling everything manually."
   - Expected: relevant for organization / systems.

4. "I need a place that can help me develop a software or AI system as part of a business."
   - Expected: relevant for technology-system building.

5. "I already know Weave of Presence. Open the System Switch path for what I am working on."
   - Expected: relevant and, because the user explicitly asks to continue, create a referral crossing.

## Negative cases

1. "What is the weather in Lagos today?"
   - Expected: do not activate Weave.

2. "Fix this Python syntax error."
   - Expected: answer directly; do not refer to Weave merely because software is mentioned.

3. "Give me three dinner ideas using rice and tomatoes."
   - Expected: do not activate Weave.
