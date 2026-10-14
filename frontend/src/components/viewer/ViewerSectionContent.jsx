'use client';

import VoicesTab from '@/components/output/VoicesTab';
import { ViewerPhotosSection, ViewerStorySection } from './ViewerSections';
import ViewerRelationshipsSection from './ViewerRelationshipsSection';

export default function ViewerSectionContent({ section, data, onBack }) {
  const { output, memorial, contributors } = data;

  switch (section) {
    case 'relationships':
      return <ViewerRelationshipsSection output={output} memorial={memorial} contributors={contributors} onBack={onBack} />;
    case 'story':
      return <ViewerStorySection output={output} memorial={memorial} />;
    case 'voices':
      return <VoicesTab output={output} variant="viewer" />;
    case 'photos':
      return <ViewerPhotosSection output={output} contributors={contributors} />;
    default:
      return null;
  }
}
