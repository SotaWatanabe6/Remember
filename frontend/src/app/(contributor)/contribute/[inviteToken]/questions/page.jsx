'use client';

import { useParams } from 'next/navigation';
import QuestionnaireFlow from '@/components/contributor/QuestionnaireFlow.jsx';

export default function QuestionsPage() {
  const { inviteToken } = useParams();
  return <QuestionnaireFlow inviteToken={inviteToken} />;
}