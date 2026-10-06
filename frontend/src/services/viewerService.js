import { createShareLink } from '@/lib/api';

export async function getMemorialViewerPath(memorialId) {
  const response = await createShareLink(memorialId);
  const token = response?.share_link?.token;
  if (!token || typeof token !== 'string') throw new Error('The memorial share link could not be loaded.');
  return `/share/${encodeURIComponent(token)}`;
}
