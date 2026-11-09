-- Address where an account receives mail when its sign-in address is fictitious.
ALTER TABLE "utilisateurs" ADD COLUMN "emailReception" TEXT;
