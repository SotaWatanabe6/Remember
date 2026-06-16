// frontend/src/lib/contribute/questionnaireQuestions.js

export const CONTRIBUTOR_QUESTIONNAIRE_QUESTIONS = [
  {
    id: "hobbies_loved_doing",
    prompt: "What were their hobbies and what did they love doing?",
    helperText: "Share the pastimes, routines, interests, or simple pleasures that felt like them.",
  },
  {
    id: "unique_human_detail",
    prompt:
      "What is something about them that made them unique? Could be something funny, stubborn, strange, or just very human about them.",
    helperText: "The quirks and ordinary details can make a memory feel especially real.",
  },
  {
    id: "relationship_and_unknown_detail",
    prompt:
      "How did you know this person and what kind of memories did you share together? What kind of person were they from your eyes and what would you want the world to remember about this person?",
    helperText:
      "This could be a side of them you saw through your relationship, work, family, or friendship.",
  },
  {
    id: "significant_moments",
    prompt:
      "What were the most significant moments you remember about them during the time you knew them?",
    helperText: "Think of moments that stayed with you, whether they were big milestones or quiet scenes.",
  },
  {
    id: "character_personality",
    prompt: "How would you describe this person's character and personality?",
    helperText: "Describe how they moved through the world and how people experienced them.",
  },
  {
    id: "life_roles_accomplishments",
    prompt:
      "Tell us about their life — for example, their career, the roles they played, their family, their accomplishments, or the things they achieved in life.",
    helperText:
      "Include the parts of their story that help others understand the shape of their life.",
  },
];

/**
 * Personalizes a question prompt with the deceased's name, e.g.
 * "What were their hobbies...?" -> "What were Eleanor's hobbies...?"
 *
 * Falls back to the original prompt (generic "them"/"their"/"this person")
 * if no subject name is available.
 */
export function formatQuestionPrompt(prompt, subjectName) {
  const name = (subjectName || "").trim();

  if (!name) {
    return prompt;
  }

  return prompt
    .replace(/\bthis person\b/gi, name)
    .replace(/\btheir\b/gi, `${name}'s`)
    .replace(/\bthem\b/gi, name)
    .replace(/\bthey\b/gi, name);
}