'use client';

import VoicesTab from '@/components/output/VoicesTab';
import { ViewerPhotosSection, ViewerRelationshipsSection, ViewerStorySection } from './ViewerSections';

export default function ViewerSectionContent({ section, data }) {
  const { output, memorial, contributors } = data;

  switch (section) {
    case 'relationships':
      return <ViewerRelationshipsSection output={output} memorial={memorial} contributor={contributors} />;
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
