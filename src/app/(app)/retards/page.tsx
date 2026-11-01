import type { Metadata } from 'next';

import { ContenuRetards } from './contenu';

export const metadata: Metadata = {
  title: 'Publications en retard — DIFFUSIO',
};

export default function PageRetards() {
  return <ContenuRetards />;
}
