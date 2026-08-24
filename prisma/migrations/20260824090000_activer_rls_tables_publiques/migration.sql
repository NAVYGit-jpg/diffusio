-- Ferme l'API PostgREST sur toutes les tables du schema public.
--
-- Supabase expose automatiquement le schema public par son API REST. Sans
-- securite au niveau des lignes, la cle publiable -- celle qui est faite pour
-- etre distribuee a un navigateur -- donnait lecture et ecriture sur chaque
-- table : comptes et empreintes de mots de passe compris. Mesure avant
-- correction : 3 utilisateurs, 72 entrees de journal d'audit et l'ensemble des
-- messages etaient lisibles par quiconque detenait cette cle.
--
-- Aucune politique n'est creee, et c'est voulu. L'application ne passe jamais
-- par PostgREST : elle se connecte en Postgres avec le role « postgres », qui
-- possede les tables et porte BYPASSRLS. RLS active sans politique refuse donc
-- les roles anon et authenticated, et laisse l'application intacte -- verifie
-- des deux cotes, l'API renvoyant zero ligne quand l'application les lit
-- toutes.
--
-- La boucle porte sur les tables existantes plutot que sur une liste ecrite a
-- la main : une table ajoutee plus tard doit etre couverte par une nouvelle
-- migration, et une liste figee ici donnerait l'illusion du contraire.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END
$$;
