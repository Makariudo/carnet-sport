-- Adresses autorisées à se connecter. Remplace l'adresse ci-dessous par la tienne, exécute dans le SQL Editor,
-- puis remets ce fichier dans son état d'origine : il ne doit pas partir dans un commit avec une vraie adresse.
insert into public.allowed_emails (email) values
  ('ton.adresse@gmail.com')
on conflict do nothing;
