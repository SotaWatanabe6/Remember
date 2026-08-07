# Remember

An AI memorial platform that turns a family's photos, voice recordings, and memories of a loved one into a lasting, shareable story.

At a Glance
	
Role	Founder & Product Lead
Timeline	0 → 1 in 11 weeks (3 phases, 100% on-time milestone delivery)
Team	9 (6 engineers, 3 designers)
Outcome	2nd of 10 teams, Demo Day
Research	25 customer interviews → 58 user stories across 11 areas
AI Performance	+25% vision model accuracy via evaluation and guardrails
The Problem

When someone loses a parent, the memories that matter most — their voice, their stories, the small details only certain people remember — are scattered across phones, group texts, old photo albums, and the people who knew them. Nothing brings those fragments together before they fade, and no existing memorial product treats voice and story as first-class data, not just an afterthought to a photo gallery.

Why It Matters

Every major life transition creates a wave of unmet product need before a category consolidates around it — the same pattern that built modern platforms for wills, wedding planning, and baby milestones. Grief and remembrance is one of the last major life categories without a dominant digital product, despite a large and recurring addressable audience: everyone eventually loses a parent. Remember is built to be the first mover in that space with a defensible data model (Answers, Photos, Voices) that's hard to replicate with a generic photo-sharing tool.

Voice of Customer

Product direction was grounded in direct research with the target audience — adult children who have lost a parent — not assumption:

Conducted 25 customer interviews to surface real pain points around grief, memory loss, and the shortcomings of existing tools
Translated findings into 58 user stories across 11 distinct areas of the remembrance and grieving process
Defined ICP and validated positioning through competitive analysis against existing memorial platforms
Used research to prioritize the product roadmap and shape the three-input model that anchors the entire product
The Product

Families and friends contribute in three ways:

Answers — relationship-specific questionnaires that surface stories only certain people would know
Photos — images of the deceased, organized and made explorable
Voices — audio recordings, preserved and searchable

These inputs are processed into four outputs: a Story slideshow, a Constellation view connecting related memories, a Voices archive, and a Photo gallery.

Impact
Shipped MVP from 0 to 1 across 3 phases in 11 weeks, with 100% sprint completion and every milestone hit on time
Improved AI vision model accuracy by 25% through structured model evaluation and output guardrails
Placed 2nd of 10 teams at Demo Day
Led a 9-person cross-functional team (6 engineers, 3 designers) from concept through ship, managing roadmap and GTM in parallel
How It's Built

Architecture — a three-layer platform: a contribution layer where families submit their inputs, an AI pipeline that structures the raw material, and an output microsite delivered to each family.

AI Pipeline

Function	Tool
Speech-to-text	AssemblyAI (selected over Whisper after head-to-head evaluation)
Photo understanding	GPT-4o Vision
NLP / semantic processing	Claude Sonnet
Retrieval	FAISS

Stack — Next.js, Supabase, Node.js, deployed on Vercel and Render.
