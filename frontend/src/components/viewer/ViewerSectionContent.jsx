'use client';

import ViewerRelationshipsSection from './ViewerRelationshipsSection';
import ViewerStorySection from './ViewerStorySection';
import ViewerVoicesSection from './ViewerVoicesSection';
import ViewerPhotoArchive from './ViewerPhotoArchive';

export default function ViewerSectionContent({ section, data, onBack }) {
  const { output, memorial, contributors } = data;

  switch (section) {
    case 'relationships':
      return <ViewerRelationshipsSection output={output} memorial={memorial} contributors={contributors} onBack={onBack} />;
    case 'story':
      return <ViewerStorySection output={output} memorial={memorial} onBack={onBack} />;
    case 'voices':
      return <ViewerVoicesSection output={output} />;
    case 'photos':
      return <ViewerPhotoArchive output={output} contributors={contributors} />;
    default:
      return null;
  }
}
