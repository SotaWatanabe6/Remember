export function buildConstellationNodes(constellation) {
  return (constellation?.nodes || []).map((node) => {
    const isMemory = node.category === 'memory';
    const urls = (node.photo_urls || []).filter((url) => typeof url === 'string' && url);
    // Memory nodes may display only the one explicitly selected match, never a cover or contributor upload.
    const photoUrls = isMemory ? (node.photo_ids?.length === 1 && node.photo_match?.photo_id === node.photo_ids[0] ? urls.slice(0, 1) : []) : urls;
    return {
      id: node.id,
      name: node.label,
      category: node.category,
      contributor_id: node.contributor_id,
      contributor_name: node.contributor_name,
      relationship_type: isMemory ? (node.relationship_type || 'other').replace(/^./, (letter) => letter.toUpperCase()) : undefined,
      prominence: node.prominence_score ?? 0.7,
      summary: node.summary,
      photo_urls: photoUrls,
      photos: isMemory ? (photoUrls.length ? node.photo_ids : []) : (node.photos || node.photo_ids || []),
      quotes: node.quotes || [],
      contributions: isMemory ? 1 : photoUrls.length,
    };
  });
}
