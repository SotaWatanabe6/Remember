/** Mirror of frontend contributor questions — used by AI pipeline for context. */
const CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS = [
  { id: 'small_habit', prompt: 'What is one small habit, phrase, or ritual of theirs that you remember clearly?' },
  { id: 'story_you_tell', prompt: 'What is a story about them that you often find yourself telling?' },
  { id: 'how_they_made_people_feel', prompt: 'How did they make people feel when they were around?' },
  { id: 'something_others_may_not_know', prompt: 'What is something about them that other people may not have known?' },
  { id: 'vivid_moment', prompt: 'What is one moment with them that still feels vivid to you?' },
  { id: 'what_they_taught', prompt: 'What did they teach you, directly or indirectly?' },
  { id: 'human_detail', prompt: 'What is something funny, stubborn, strange, or very human about them?' },
  { id: 'what_to_remember', prompt: 'What do you hope people remember about them?' },
]

const QUESTION_PROMPT_BY_ID = Object.fromEntries(
  CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS.map((q) => [q.id, q.prompt]),
)

function resolveQuestionPrompt(response) {
  if (response.question_text?.trim()) return response.question_text.trim()
  if (response.question_id && QUESTION_PROMPT_BY_ID[response.question_id]) {
    return QUESTION_PROMPT_BY_ID[response.question_id]
  }
  return 'Memory shared about them'
}

module.exports = {
  CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS,
  QUESTION_PROMPT_BY_ID,
  resolveQuestionPrompt,
}
