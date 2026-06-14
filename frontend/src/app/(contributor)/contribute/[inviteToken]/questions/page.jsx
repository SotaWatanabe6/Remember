import QuestionnaireFlow from "@/components/contributor/QuestionnaireFlow.jsx";

export default async function QuestionsPage({ params }) {
  const { inviteToken } = await params;

  return <QuestionnaireFlow inviteToken={inviteToken} />;
}
