# Carnet sport

PWA de suivi d'entraînement : course, vélo, home trainer, natation et PPG.
Même socle que « Notre budget » : Vue 3 + TypeScript + Vite PWA, Supabase (connexion Google), hébergement Netlify.

## Fonctionnalités

- **Saisie rapide** (onglet Saisir) : sport, distance, durée, l'allure ou la vitesse se calcule. « Refaire » reprend une séance récente en un geste ; ce qui est prévu aujourd'hui au planning se préremplit.
- **Blocs structurés** pour le fractionné, sur une ligne : `10x1000 en 3'05 r1'30`, `10x400 en 72'' r200m`, `20x30/30`, `3x2km à 3'20/km r2'`, plusieurs blocs séparés par `+`. Les chronos de chaque répétition sont facultatifs.
- **Jalons** : une séance marquée comme jalon (étoile) rejoint la page Jalons, regroupée avec les séances comparables (même structure de blocs, ou même type et distance). On en compare jusqu'à 4 : tableau et courbe répétition par répétition.
- **Stats** : km par semaine ou par mois sur 12 périodes, par sport, avec totaux semaine / mois / année.
- **PPG** : programmes types (exercices comptés ou minutés, séries, récup, tours), minuteur plein écran avec bips et vibrations, journal.
- **Planning** de la semaine, coché automatiquement quand la séance prévue est saisie.
- **Calculateur d'allure** (porté de cap-demo) : table allure × distance, VMA, estimation de VMA depuis un chrono, zones colorées.

Les séances gardent leur source (`manuel` aujourd'hui) et un identifiant externe : un futur import Polar / Garmin / Coros ne créera pas de doublon.

## Développement

```bash
npm install
npm run dev     # http://localhost:5173, mode démo avec données d'exemple
npm test        # tests des décodeurs (durées, blocs), du minuteur et du calculateur
npm run build
```

Sans variables Supabase, l'app tourne en **mode démo** : les données restent dans le navigateur.

## Mise en place Supabase (projet dédié)

1. Créer un nouveau projet Supabase (offre gratuite : 2 projets actifs).
2. SQL Editor : exécuter `supabase/migrations/20261121000000_sport.sql`.
3. Mettre ton adresse dans `supabase/setup-acces.sql`, l'exécuter, puis remettre le fichier dans son état d'origine (ne pas commiter l'adresse).
4. Authentication > Hooks > Before User Created → Postgres → `public.hook_before_user_created`.
5. Google : réutiliser le projet Google Cloud du budget en ajoutant la Callback URL du nouveau projet Supabase au client OAuth (ou créer un client dédié), puis Authentication > Sign In / Providers > Google dans Supabase.
6. URL Configuration : Site URL = l'adresse Netlify ; Redirect URLs = l'adresse Netlify, `http://localhost:5173`, `https://*--<site>.netlify.app`.
7. Netlify : variables `VITE_SUPABASE_URL` (URL complète `https://<ref>.supabase.co`) et `VITE_SUPABASE_PUBLISHABLE_KEY`, puis redéployer.

En local, mettre ces deux variables dans un fichier `.env.local` (ignoré par git).
