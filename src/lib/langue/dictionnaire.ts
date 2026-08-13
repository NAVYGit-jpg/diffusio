/**
 * Interface wording in the three offered languages (cahier des charges §9.5).
 *
 * French is the reference: it is the language of the Ivorian administration and
 * the one every screen was written in. English and Portuguese are translations
 * of it, and a missing key falls back to French rather than showing a bare
 * identifier — an untranslated label is a small annoyance, `nav.calendrier` on
 * screen is a defect.
 *
 * Flat keys rather than nested objects: a nested tree looks tidier and makes
 * every lookup a runtime gamble on the shape.
 */

export const LANGUES = [
  { code: 'FR', libelle: 'Français', drapeau: '🇫🇷', etiquette: 'FR' },
  { code: 'EN', libelle: 'English', drapeau: '🇬🇧', etiquette: 'EN' },
  { code: 'PT', libelle: 'Português', drapeau: '🇵🇹', etiquette: 'PT' },
] as const;

export type CodeLangue = (typeof LANGUES)[number]['code'];

export const LANGUE_PAR_DEFAUT: CodeLangue = 'FR';

/** Every key the interface can translate. French doubles as the source text. */
const FR = {
  // Navigation
  'nav.tableauDeBord': 'Tableau de bord',
  'nav.structures': 'Structures',
  'nav.utilisateurs': 'Utilisateurs',
  'nav.catalogue': 'Publications & indicateurs',
  'nav.calendrier': 'Calendrier de diffusion',
  'nav.imminentes': 'Publications imminentes',
  'nav.produitsCharges': 'Produits chargés',
  'nav.retards': 'Publications en retard',
  'nav.equipe': 'Équipe',
  'nav.notifications': 'Notifications',
  'nav.discussion': 'Discussion',
  'nav.principale': 'Navigation principale',

  // En-tête et compte
  'entete.notifications': 'Notifications',
  'entete.langue': 'Langue de l’interface',
  'compte.profil': 'Mon profil',
  'compte.apparence': 'Logo et slogan',
  'compte.theme': 'Thème',
  'compte.themeClair': 'Clair',
  'compte.themeSombre': 'Sombre',
  'compte.themeSysteme': 'Système',
  'compte.deconnexion': 'Se déconnecter',

  // Rôles
  'role.SUPER_ADMIN': 'Super administrateur',
  'role.ADMIN': 'Administrateur',
  'role.POINT_FOCAL': 'Point focal',

  // Actions communes
  'action.enregistrer': 'Enregistrer',
  'action.annuler': 'Annuler',
  'action.fermer': 'Fermer',
  'action.modifier': 'Modifier',
  'action.supprimer': 'Supprimer',
  'action.telecharger': 'Télécharger',
  'action.publier': 'Publier',
  'action.reinitialiser': 'Réinitialiser par défaut',

  // Statuts d'une ligne de calendrier
  'statut.PLANIFIE': 'Planifié',
  'statut.A_VENIR': 'À venir',
  'statut.TELEVERSE': 'Livré',
  'statut.MIS_EN_LIGNE': 'Publié',
  'statut.EN_RETARD': 'En retard',
  'statut.ANNULE': 'Annulé',

  // Messages transverses
  'commun.chargement': 'Chargement…',
  'commun.aucunResultat': 'Aucun résultat',
  'langue.changee': 'Langue modifiée.',
} as const;

export type CleTraduction = keyof typeof FR;

const EN: Partial<Record<CleTraduction, string>> = {
  'nav.tableauDeBord': 'Dashboard',
  'nav.structures': 'Structures',
  'nav.utilisateurs': 'Users',
  'nav.catalogue': 'Publications & indicators',
  'nav.calendrier': 'Release calendar',
  'nav.imminentes': 'Upcoming releases',
  'nav.produitsCharges': 'Submitted products',
  'nav.retards': 'Overdue releases',
  'nav.equipe': 'Team',
  'nav.notifications': 'Notifications',
  'nav.discussion': 'Messages',
  'nav.principale': 'Main navigation',

  'entete.notifications': 'Notifications',
  'entete.langue': 'Interface language',
  'compte.profil': 'My profile',
  'compte.apparence': 'Logo and tagline',
  'compte.theme': 'Theme',
  'compte.themeClair': 'Light',
  'compte.themeSombre': 'Dark',
  'compte.themeSysteme': 'System',
  'compte.deconnexion': 'Sign out',

  'role.SUPER_ADMIN': 'Super administrator',
  'role.ADMIN': 'Administrator',
  'role.POINT_FOCAL': 'Focal point',

  'action.enregistrer': 'Save',
  'action.annuler': 'Cancel',
  'action.fermer': 'Close',
  'action.modifier': 'Edit',
  'action.supprimer': 'Delete',
  'action.telecharger': 'Download',
  'action.publier': 'Publish',
  'action.reinitialiser': 'Reset to defaults',

  'statut.PLANIFIE': 'Planned',
  'statut.A_VENIR': 'Upcoming',
  'statut.TELEVERSE': 'Submitted',
  'statut.MIS_EN_LIGNE': 'Published',
  'statut.EN_RETARD': 'Overdue',
  'statut.ANNULE': 'Cancelled',

  'commun.chargement': 'Loading…',
  'commun.aucunResultat': 'No results',
  'langue.changee': 'Language changed.',
};

const PT: Partial<Record<CleTraduction, string>> = {
  'nav.tableauDeBord': 'Painel',
  'nav.structures': 'Estruturas',
  'nav.utilisateurs': 'Utilizadores',
  'nav.catalogue': 'Publicações e indicadores',
  'nav.calendrier': 'Calendário de divulgação',
  'nav.imminentes': 'Divulgações iminentes',
  'nav.produitsCharges': 'Produtos carregados',
  'nav.retards': 'Divulgações em atraso',
  'nav.equipe': 'Equipa',
  'nav.notifications': 'Notificações',
  'nav.discussion': 'Mensagens',
  'nav.principale': 'Navegação principal',

  'entete.notifications': 'Notificações',
  'entete.langue': 'Idioma da interface',
  'compte.profil': 'O meu perfil',
  'compte.apparence': 'Logótipo e slogan',
  'compte.theme': 'Tema',
  'compte.themeClair': 'Claro',
  'compte.themeSombre': 'Escuro',
  'compte.themeSysteme': 'Sistema',
  'compte.deconnexion': 'Terminar sessão',

  'role.SUPER_ADMIN': 'Super administrador',
  'role.ADMIN': 'Administrador',
  'role.POINT_FOCAL': 'Ponto focal',

  'action.enregistrer': 'Guardar',
  'action.annuler': 'Cancelar',
  'action.fermer': 'Fechar',
  'action.modifier': 'Editar',
  'action.supprimer': 'Eliminar',
  'action.telecharger': 'Transferir',
  'action.publier': 'Publicar',
  'action.reinitialiser': 'Repor predefinições',

  'statut.PLANIFIE': 'Planeado',
  'statut.A_VENIR': 'Próximo',
  'statut.TELEVERSE': 'Entregue',
  'statut.MIS_EN_LIGNE': 'Publicado',
  'statut.EN_RETARD': 'Em atraso',
  'statut.ANNULE': 'Cancelado',

  'commun.chargement': 'A carregar…',
  'commun.aucunResultat': 'Sem resultados',
  'langue.changee': 'Idioma alterado.',
};

const DICTIONNAIRES: Record<CodeLangue, Partial<Record<CleTraduction, string>>> =
  { FR, EN, PT };

/**
 * Translates one key.
 *
 * Falls back to French, then to the key itself. A screen must never be able to
 * show a raw identifier because somebody forgot a line in a dictionary.
 */
export function traduire(cle: CleTraduction, langue: CodeLangue): string {
  return DICTIONNAIRES[langue]?.[cle] ?? FR[cle] ?? cle;
}

/** Bound translator, so a component reads `t('nav.equipe')`. */
export function traducteur(langue: CodeLangue) {
  return (cle: CleTraduction) => traduire(cle, langue);
}

/** Normalises whatever came from the database or a form. */
export function langueValide(valeur: unknown): CodeLangue {
  return LANGUES.some((langue) => langue.code === valeur)
    ? (valeur as CodeLangue)
    : LANGUE_PAR_DEFAUT;
}

/** BCP-47 tag, for `<html lang>` and date formatting. */
export function baliseLangue(langue: CodeLangue): string {
  return { FR: 'fr', EN: 'en', PT: 'pt' }[langue];
}

/** Keys not yet translated in a given language — used by the tests. */
export function clesManquantes(langue: CodeLangue): CleTraduction[] {
  const dictionnaire = DICTIONNAIRES[langue];

  return (Object.keys(FR) as CleTraduction[]).filter(
    (cle) => dictionnaire[cle] === undefined,
  );
}
