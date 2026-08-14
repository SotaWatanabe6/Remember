/** Mirror of frontend contributor questions — used by AI pipeline for context.
 * Twelve relationship-specific question sets (US-31). [first name] is
 * substituted with the subject's actual first name when a response is
 * resolved via resolveQuestionPrompt.
 */

const RELATIONSHIP_QUESTION_SETS = {
  friend: [
    { id: 'friend_1', prompt: "What's a memory with [first name] that still makes you smile when you think about it?" },
    { id: 'friend_2', prompt: 'How would you describe [first name] to someone who never got to meet them?' },
    { id: 'friend_3', prompt: 'What did [first name] always do or say that was completely, unmistakably them?' },
    { id: 'friend_4', prompt: "Was there a tradition, hangout spot, or running joke that was just yours and [first name]'s?" },
    { id: 'friend_5', prompt: "What's something [first name] taught you, on purpose or without meaning to?" },
    { id: 'friend_6', prompt: 'If you had one more afternoon with [first name], what would you want to do together?' },
  ],
  colleague: [
    { id: 'colleague_1', prompt: 'What was it like working alongside [first name] day to day?' },
    { id: 'colleague_2', prompt: "What's a moment at work when [first name] really stood out to you?" },
    { id: 'colleague_3', prompt: 'How did [first name] treat the people around them at the office?' },
    { id: 'colleague_4', prompt: 'Was there a habit, phrase, or quirk [first name] was known for at work?' },
    { id: 'colleague_5', prompt: "What's something you learned from [first name] professionally or personally?" },
    { id: 'colleague_6', prompt: 'How did [first name] show up for their team when things got hard?' },
  ],
  partner: [
    { id: 'partner_1', prompt: 'What was it like the first time you really got to know [first name]?' },
    { id: 'partner_2', prompt: "What's a small, everyday habit of [first name]'s you'll never forget?" },
    { id: 'partner_3', prompt: 'How did [first name] show love, even on ordinary days?' },
    { id: 'partner_4', prompt: "What's a moment together that you keep coming back to?" },
    { id: 'partner_5', prompt: 'What did [first name] worry about, care about, or fight for?' },
    { id: 'partner_6', prompt: 'What do you most want people to understand about who [first name] really was?' },
  ],
  spouse_family: [
    { id: 'spouse_family_1', prompt: 'What was daily life with [first name] actually like?' },
    { id: 'spouse_family_2', prompt: "What's a story about [first name] that your family tells over and over?" },
    { id: 'spouse_family_3', prompt: 'How did [first name] handle the hard moments — for themselves or for the family?' },
    { id: 'spouse_family_4', prompt: "What's something [first name] always insisted on or always did the same way?" },
    { id: 'spouse_family_5', prompt: 'What did [first name] love talking about, doing, or making time for?' },
    { id: 'spouse_family_6', prompt: 'What do you hope the rest of the family remembers most about [first name]?' },
  ],
  parent: [
    { id: 'parent_1', prompt: 'What was [first name] like as a parent, day to day?' },
    { id: 'parent_2', prompt: "What's something [first name] always said to you growing up?" },
    { id: 'parent_3', prompt: 'What did [first name] want for you, and how did they show it?' },
    { id: 'parent_4', prompt: "What's a moment when [first name] showed up for you in a way you'll never forget?" },
    { id: 'parent_5', prompt: 'What did [first name] care about most outside of raising you?' },
    { id: 'parent_6', prompt: "What's a habit or ritual from your childhood that was distinctly [first name]'s?" },
  ],
  sibling: [
    { id: 'sibling_1', prompt: "What's a memory from growing up with [first name] that still makes you laugh?" },
    { id: 'sibling_2', prompt: 'What kind of sibling was [first name] — protective, competitive, the peacemaker, something else?' },
    { id: 'sibling_3', prompt: "What's something only the two of you would understand or find funny?" },
    { id: 'sibling_4', prompt: 'How did [first name] change or stay exactly the same as you both got older?' },
    { id: 'sibling_5', prompt: 'What did [first name] always do that drove you a little crazy but you loved anyway?' },
    { id: 'sibling_6', prompt: 'What do you wish people outside the family knew about [first name]?' },
  ],
  grandparent: [
    { id: 'grandparent_1', prompt: "What's a memory of time spent at [first name]'s house or table?" },
    { id: 'grandparent_2', prompt: 'What story did [first name] tell more than once, and how did it go?' },
    { id: 'grandparent_3', prompt: 'What was [first name] always trying to teach you, even without saying so?' },
    { id: 'grandparent_4', prompt: 'What did [first name] make, cook, fix, or do better than anyone else?' },
    { id: 'grandparent_5', prompt: "What's something [first name] said to you that you still carry with you?" },
    { id: 'grandparent_6', prompt: 'What did a normal visit with [first name] usually look like?' },
  ],
  aunt_uncle: [
    { id: 'aunt_uncle_1', prompt: "What's a memory of [first name] from a family gathering or holiday?" },
    { id: 'aunt_uncle_2', prompt: 'What made [first name] different from everyone else in the family?' },
    { id: 'aunt_uncle_3', prompt: 'Was there something [first name] always did for you or the other kids in the family?' },
    { id: 'aunt_uncle_4', prompt: "What's a story about [first name] the family still repeats?" },
    { id: 'aunt_uncle_5', prompt: 'What did [first name] care about that maybe not everyone knew?' },
    { id: 'aunt_uncle_6', prompt: 'What do you want the next generation to know about [first name]?' },
  ],
  cousin: [
    { id: 'cousin_1', prompt: "What's a memory with [first name] from a family event that still sticks with you?" },
    { id: 'cousin_2', prompt: 'What was [first name] like when the two of you were left to your own devices?' },
    { id: 'cousin_3', prompt: 'Was there a game, joke, or tradition that was just between you and [first name]?' },
    { id: 'cousin_4', prompt: 'How did your relationship with [first name] change as you both grew up?' },
    { id: 'cousin_5', prompt: "What's something about [first name] you don't think many people got to see?" },
    { id: 'cousin_6', prompt: 'What do you want people to know about the person [first name] was to you?' },
  ],
  child: [
    { id: 'child_1', prompt: "What's your earliest or clearest memory of [first name]?" },
    { id: 'child_2', prompt: 'What did [first name] always say to you, especially at certain moments?' },
    { id: 'child_3', prompt: 'How did [first name] show up for you when things were hard?' },
    { id: 'child_4', prompt: "What's a tradition or ritual that was distinctly [first name]'s?" },
    { id: 'child_5', prompt: 'What did [first name] want you to know or believe about yourself?' },
    { id: 'child_6', prompt: "What do you most want to remember about being [first name]'s child?" },
  ],
  grandchild: [
    { id: 'grandchild_1', prompt: "What's your favorite memory of time with [first name]?" },
    { id: 'grandchild_2', prompt: 'What did [first name] always do when you visited or stayed over?' },
    { id: 'grandchild_3', prompt: "What's something [first name] taught you or showed you how to do?" },
    { id: 'grandchild_4', prompt: 'What story did [first name] tell you more than once?' },
    { id: 'grandchild_5', prompt: 'What made [first name] different from anyone else in your life?' },
    { id: 'grandchild_6', prompt: 'What do you want to remember most about [first name]?' },
  ],
  other: [
    { id: 'other_1', prompt: 'How did you come to know [first name]?' },
    { id: 'other_2', prompt: "What's a memory of [first name] that has stayed with you?" },
    { id: 'other_3', prompt: 'What was [first name] like in the time you knew them?' },
    { id: 'other_4', prompt: 'Was there something [first name] always said or did that stood out to you?' },
    { id: 'other_5', prompt: 'What did [first name] care about, or what mattered most to them?' },
    { id: 'other_6', prompt: 'What do you want others to know about [first name]?' },
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
    spouse_or_family: 'spouse_family',
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
