/** Mirror of frontend contributor questions — used by AI pipeline for context. */
const CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS = [
  { id: 'hobbies_loved_doing', prompt: 'What were their hobbies and what did they love doing?' },
  { id: 'unique_human_detail', prompt: 'What is something about them that made them unique? Could be something funny, stubborn, strange, or just very human about them.' },
  { id: 'relationship_and_unknown_detail', prompt: 'How did you know this person and what kind of memories did you share together? What kind of person were they from your eyes and what would you want the world to remember about this person?' },
  { id: 'significant_moments', prompt: 'What were the most significant moments you remember about them during the time you knew them?' },
  { id: 'character_personality', prompt: "How would you describe this person's character and personality?" },
  { id: 'life_roles_accomplishments', prompt: 'Tell us about their life — for example, their career, the roles they played, their family, their accomplishments, or the things they achieved in life.' },
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
