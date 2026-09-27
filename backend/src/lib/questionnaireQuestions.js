/** Mirror of frontend contributor questions — used by AI pipeline for context.
 * Twelve relationship-specific question sets (US-31), worded per the
 * "Question Design by Relationship Type" spec (NS-14) from the contributor's
 * side of the relationship (e.g. "parent" = the contributor is [first name]'s
 * parent). [first name] is
 * substituted with the subject's actual first name when a response is
 * resolved via resolveQuestionPrompt.
 */

const RELATIONSHIP_QUESTION_SETS = {
  friend: [
    { id: 'friend_1', prompt: 'How did you two meet?' },
    { id: 'friend_2', prompt: 'What are shared moments or memories you had together that show the kind of friendship you two had with [first name]?' },
    { id: 'friend_3', prompt: 'What are your favorite moments that you shared together, and what was it like?' },
    { id: 'friend_4', prompt: 'Share a time [first name] showed up for you, or someone else, in a way that stuck with you.' },
    { id: 'friend_5', prompt: 'Is there a story about [first name] that you still tell people, or think about often?' },
    { id: 'friend_6', prompt: 'What do you want the world to remember about [first name]?' },
  ],
  colleague: [
    { id: 'colleague_1', prompt: 'How did you know [first name]? What did you work on together?' },
    { id: 'colleague_2', prompt: 'Share a time at work when [first name] really impressed you, what happened?' },
    { id: 'colleague_3', prompt: 'Share a specific moment when you saw the impact [first name] had on the team or someone around them.' },
    { id: 'colleague_4', prompt: 'Was there a moment you saw a more personal side of [first name], beyond just work?' },
    { id: 'colleague_5', prompt: 'What particularly stood out about [first name] while you worked together?' },
    { id: 'colleague_6', prompt: "Is there a story about [first name] that you still tell, or a way you'd want the world to remember them?" },
  ],
  partner: [
    { id: 'partner_1', prompt: 'How did you two meet, or get together?' },
    { id: 'partner_2', prompt: 'How did [first name] handle hard moments?' },
    { id: 'partner_3', prompt: 'What were your favorite moments that you spent together?' },
    { id: 'partner_4', prompt: 'Who was [first name] to you as a partner? Share a moment that captures it.' },
    { id: 'partner_5', prompt: 'What is something about [first name] that you think only you know, that you want to share with the world?' },
    { id: 'partner_6', prompt: "Is there a story about [first name] that you still tell, or a way you'd want the world to remember them?" },
  ],
  spouse: [
    { id: 'spouse_1', prompt: 'How did you two meet, or get together?' },
    { id: 'spouse_2', prompt: 'How did [first name] handle hard moments?' },
    { id: 'spouse_3', prompt: 'What were your favorite moments that you spent together?' },
    { id: 'spouse_4', prompt: 'Who was [first name] to you as a spouse? Share a moment that captures it.' },
    { id: 'spouse_5', prompt: 'What is something about [first name] that you think only you know, that you want to share with the world?' },
    { id: 'spouse_6', prompt: "Is there a story about [first name] that you still tell, or a way you'd want the world to remember them?" },
  ],
  parent: [
    { id: 'parent_1', prompt: "Share a memory from [first name]'s childhood, what was their upbringing like?" },
    { id: 'parent_2', prompt: 'What did [first name] like or enjoy doing?' },
    { id: 'parent_3', prompt: 'What were your proudest moments that you had with [first name]?' },
    { id: 'parent_4', prompt: 'Share a time [first name] showed up for you, or someone else, in a way that stuck with you.' },
    { id: 'parent_5', prompt: 'What was it like watching [first name] grow and become who they were over the years?' },
    { id: 'parent_6', prompt: "Is there a story about [first name] that you still tell, or a way you'd want the world to remember them?" },
  ],
  sibling: [
    { id: 'sibling_1', prompt: 'What was your early childhood like together with [first name]?' },
    { id: 'sibling_2', prompt: 'What did [first name] like or enjoy doing?' },
    { id: 'sibling_3', prompt: 'As you both grew older, how did your relationship with [first name] evolve, and what was that like?' },
    { id: 'sibling_4', prompt: 'Share a time [first name] showed up for you, or someone else, in a way that stuck with you.' },
    { id: 'sibling_5', prompt: 'What role did [first name] play in your family, the peacemaker, the troublemaker, the one everyone went to?' },
    { id: 'sibling_6', prompt: "Is there a story about [first name] that you still tell, or a way you'd want the world to remember them?" },
  ],
  grandparent: [
    { id: 'grandparent_1', prompt: 'What did you most enjoy about your time with [first name]?' },
    { id: 'grandparent_2', prompt: "What was it like being [first name]'s grandparent?" },
    { id: 'grandparent_3', prompt: 'What is your favorite memory/experience you had with [first name]?' },
    { id: 'grandparent_4', prompt: "How did it feel to watch [first name] grow up across the years, even if you weren't there for all of it?" },
    { id: 'grandparent_5', prompt: 'Did you ever see parts of yourself, or other family, in [first name]?' },
    { id: 'grandparent_6', prompt: "Is there a story about [first name] that you still tell, or a way you'd want the world to remember them?" },
  ],
  aunt_uncle: [
    { id: 'aunt_uncle_1', prompt: 'Share a memory from when [first name] was younger, what do you remember about that time in their life?' },
    { id: 'aunt_uncle_2', prompt: 'What did [first name] like or enjoy doing?' },
    { id: 'aunt_uncle_3', prompt: 'Share one of your proudest moments with [first name].' },
    { id: 'aunt_uncle_4', prompt: 'Share a time [first name] showed up for you, or someone else, in a way that stuck with you.' },
    { id: 'aunt_uncle_5', prompt: 'What was it like watching [first name] grow and become who they were over the years?' },
    { id: 'aunt_uncle_6', prompt: "Is there a story about [first name] that you still tell, or a way you'd want the world to remember them?" },
  ],
  cousin: [
    { id: 'cousin_1', prompt: 'Share a memory from when you and [first name] were kids together, holidays, summers, family gatherings, whatever comes to mind.' },
    { id: 'cousin_2', prompt: 'What did [first name] like or enjoy doing?' },
    { id: 'cousin_3', prompt: 'As you both grew older, how did your relationship with [first name] evolve, and what was that like?' },
    { id: 'cousin_4', prompt: 'Share a time [first name] showed up for you, or someone else, in a way that stuck with you.' },
    { id: 'cousin_5', prompt: 'What role did [first name] play in your family, the peacemaker, the troublemaker, the one everyone went to?' },
    { id: 'cousin_6', prompt: "Is there a story about [first name] that you still tell, or a way you'd want the world to remember them?" },
  ],
  child: [
    { id: 'child_1', prompt: 'What did [first name] teach you, the values or lessons that have stayed with you?' },
    { id: 'child_2', prompt: "Was there a moment, maybe later in life, when you saw [first name] differently, understood something about them you didn't before?" },
    { id: 'child_3', prompt: "What's your favorite memory with [first name]?" },
    { id: 'child_4', prompt: 'Is there a story about [first name] you find yourself telling again and again?' },
    { id: 'child_5', prompt: "What was [first name]'s character like? What stands out about who they were as a person?" },
    { id: 'child_6', prompt: 'What do you hope to carry forward from [first name]?' },
  ],
  grandchild: [
    { id: 'grandchild_1', prompt: "What did [first name] teach you, stories, values, a skill, anything that's stayed with you?" },
    { id: 'grandchild_2', prompt: "What's your favorite memory with [first name]?" },
    { id: 'grandchild_3', prompt: 'Did [first name] ever share stories about their own life, their past, where they came from? What do you remember?' },
    { id: 'grandchild_4', prompt: 'Share a time [first name] showed up for you in a way that stuck with you.' },
    { id: 'grandchild_5', prompt: 'What did you come to understand about [first name] as a person, beyond just being your grandparent?' },
    { id: 'grandchild_6', prompt: 'Is there a story about [first name] you find yourself telling again and again, or a way you hope the world remembers them?' },
  ],
  other: [
    { id: 'other_1', prompt: 'How did you know [first name]? What was your relationship like?' },
    { id: 'other_2', prompt: "What's a favorite memory you have with [first name]?" },
    { id: 'other_3', prompt: 'What did [first name] like or enjoy doing?' },
    { id: 'other_4', prompt: 'Share a time [first name] showed up for you, or someone else, in a way that stuck with you.' },
    { id: 'other_5', prompt: "What's something about [first name] that maybe not everyone got to see, because of how you two knew each other?" },
    { id: 'other_6', prompt: "Is there a story about [first name] that you still tell, or a way you'd want the world to remember them?" },
  ],
}

/** Flat list of every question across all relationship sets — used for
 * ID-based lookups when the specific relationship type isn't known
 * (e.g. resolving an already-saved response). */
const CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS = Object.values(RELATIONSHIP_QUESTION_SETS).flat()

const QUESTION_PROMPT_BY_ID = Object.fromEntries(
  CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.map((q) => [q.id, q.prompt]),
)

function normalizeQuestionSetKey(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[\s/]+/g, '_')

  const aliases = {
    aunt_or_uncle: 'aunt_uncle',
    grandchildren: 'grandchild',
    grandkid: 'grandchild',
    grandkids: 'grandchild',
    husband: 'spouse',
    wife: 'spouse',
    spouse_family: 'spouse',
    spouse_or_family: 'spouse',
  }

  return aliases[key] || key
}

/** Returns the 6-question set for a given relationship type, falling back
 * to 'other' if the type isn't recognized. */
function getQuestionSetForRelationship(relationshipType) {
  const key = normalizeQuestionSetKey(relationshipType)
  return RELATIONSHIP_QUESTION_SETS[key] || RELATIONSHIP_QUESTION_SETS.other
}

function getQuestionSetForContributorRelationship(relationshipType, relationshipLabel = '') {
  const relationshipKey = normalizeQuestionSetKey(relationshipType)
  const relationshipLabelKey = normalizeQuestionSetKey(relationshipLabel)

  if (relationshipKey === 'family' && relationshipLabelKey) {
    return getQuestionSetForRelationship(relationshipLabelKey)
  }

  return getQuestionSetForRelationship(relationshipKey)
}

/** Substitutes [first name] in a prompt with the subject's actual first name. */
function formatQuestionPrompt(prompt, subjectName) {
  const name = (subjectName || '').trim()
  if (!name) return prompt
  const firstName = name.split(/\s+/)[0]
  return prompt.replace(/\[first name\]/gi, firstName)
}

function resolveQuestionPrompt(response) {
  if (response.question_text?.trim()) return response.question_text.trim()
  if (response.question_id && QUESTION_PROMPT_BY_ID[response.question_id]) {
    return QUESTION_PROMPT_BY_ID[response.question_id]
  }
  return 'Memory shared about them'
}

module.exports = {
  RELATIONSHIP_QUESTION_SETS,
  CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS,
  QUESTION_PROMPT_BY_ID,
  getQuestionSetForRelationship,
  getQuestionSetForContributorRelationship,
  formatQuestionPrompt,
  resolveQuestionPrompt,
}
