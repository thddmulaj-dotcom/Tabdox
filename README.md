# Tadbox + Airtel Money

1. `npm install`
2. Copie `.env.example` vers `.env`
3. Mets uniquement les identifiants Airtel dans `.env`
4. Garde `AIRTEL_ENV=staging` pendant les tests.
5. Lance `npm start`.
6. Teste `/health`.
7. Dans `AirtelPaymentApi.kt`, remplace `https://CHANGE-ME.example.com` par l'URL publique du backend.

Les secrets Airtel restent côté serveur. L'IP à whitelist dans Airtel doit être celle du serveur qui appelle Airtel, pas l'IP du téléphone.

Le backend utilise les endpoints Airtel publics couramment documentés pour OAuth et collection; confirme les chemins/payloads spécifiques à ton produit RDC dans le portail avant la production.
