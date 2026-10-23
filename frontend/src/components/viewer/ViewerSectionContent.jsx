'use client';

import ViewerVoicesSection from './ViewerVoicesSection';
import ViewerPhotoArchive from './ViewerPhotoArchive';
import { ViewerRelationshipsSection, ViewerStorySection } from './ViewerSections';

export default function ViewerSectionContent({ section, data }) {
  const { output, memorial, contributors } = data;

  switch (section) {
    case 'relationships':
      return <ViewerRelationshipsSection output={output} memorial={memorial} contributor={contributors} />;
    case 'story':
      return <ViewerStorySection output={output} memorial={memorial} />;
    case 'voices':
      return <ViewerVoicesSection output={output} />;
    case 'photos':
      return <ViewerPhotoArchive output={output} contributors={contributors} />;
    default:
      return null;
  }
}