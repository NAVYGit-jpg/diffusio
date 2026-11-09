import type { Metadata } from 'next';

import { exigerActeur } from '@/lib/auth/session';
import type { ReperesCapture } from '@/lib/documentation/reperes';
import reperes from '../../../../documentation/captures/reperes.json';
import { VueDocumentation } from './vue-documentation';

export const metadata: Metadata = {
  title: 'Documentation — DIFFUSIO',
};

export default async function PageDocumentation() {
  const acteur = await exigerActeur();

  return (
    <VueDocumentation
      roleActeur={acteur.role}
      reperes={reperes as Record<string, ReperesCapture>}
    />
  );
}
