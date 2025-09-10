// This is now a server component (no 'use client' directive)
import StorePageClient from './StorePageClient';

export default function StorePage({ params }: { params: { id: string } }) {
  // Server components can access params directly
  return <StorePageClient storeId={params.id} />;
} 