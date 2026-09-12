# $CHOLO

La interfaz de tesorería testnet está en `/dao`. Consulta la [guía del DAO y cambio del primer firmante](docs/cholo-dao.md) para conectar una wallet, crear propuestas, aprobarlas y ejecutarlas.

**CHOLO es una memecoin peruana construida sobre Stacks, el ecosistema de
Bitcoin.**

Inspirada en el perro peruano sin pelo, `$CHOLO` combina cultura, humor y
comunidad para representar con orgullo una identidad latinoamericana dentro
del mundo cripto.

No pretende ser otra empresa tecnológica disfrazada de token. CHOLO es, ante
todo, una memecoin: su fuerza nace de las personas que la comparten, la usan y
construyen alrededor de ella.

## ¿Qué es CHOLO?

`$CHOLO` es un token fungible desplegado en Stacks. Su propósito es reunir una
comunidad alrededor de tres ideas:

- Celebrar la cultura peruana y latinoamericana.
- Llevar identidad, creatividad y humor al ecosistema de Bitcoin.
- Apoyar iniciativas comunitarias, ciencia descentralizada (DeSci),
  investigación, desarrollo y software de código abierto.

CHOLO no promete rentabilidad ni depende de una utilidad artificial. Es un
activo comunitario y experimental cuyo valor está ligado a la participación,
la cultura y el mercado.

## Token

| Dato | Valor |
| --- | --- |
| Nombre | CHOLO |
| Símbolo | `$CHOLO` |
| Red | Stacks Mainnet |
| Estándar | Token fungible |
| Suministro declarado | 7 000 000 000 CHOLO |
| Decimales | 8 |
| Contrato | `SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD.cholo` |
| Activo | `cholo` |

Verifica siempre el contrato completo antes de comprar, intercambiar o
transferir `$CHOLO`. No confíes únicamente en el nombre o el símbolo de un
token.

## La comunidad es la utilidad

CHOLO existe para convertirse en un punto de encuentro entre cultura,
experimentación y comunidad. Sus posibles usos incluyen:

- Creaciones, memes y experiencias comunitarias.
- Recompensas y dinámicas sociales.
- Colecciones y expresiones digitales.
- Apoyo a proyectos abiertos, científicos y culturales.
- Participación en el ecosistema de Stacks y Bitcoin.

Estas iniciativas pueden evolucionar con el tiempo y no constituyen promesas
de funcionalidad futura.

## Riesgos

Las memecoins son activos altamente especulativos. Su precio puede cambiar de
forma brusca y es posible perder la totalidad de los fondos utilizados.

- Investiga por tu cuenta antes de interactuar con el token.
- Verifica la red, el contrato, las direcciones y los importes.
- Nunca compartas tu frase semilla ni tus claves privadas.
- Desconfía de cuentas, contratos y sitios que suplanten a CHOLO.
- No uses dinero que no puedas permitirte perder.

Nada de lo publicado aquí constituye asesoría financiera, legal o fiscal.

## Manifiesto

Somos cultura antes que tendencia.

Somos comunidad antes que promesas.

Somos CHOLO: nacidos en el Perú, construyendo sobre Bitcoin y abiertos al
mundo.

## Licencia

Los recursos de código abierto asociados al proyecto se distribuyen bajo la
[GNU General Public License v3.0](LICENSE).

### Social authentication for potential rewards

Participants accept the current terms and authenticate either X or Instagram.
Following is optional via external links. Eligibility indicates a profile may be
reviewed manually; it does not approve or distribute a reward. The legacy claim
and API-follow endpoints return HTTP 410. Existing claim history is preserved.

Before enabling Instagram, apply
`supabase/migrations/20260905000000_add_instagram_reward_identity.sql` and configure:

- `INSTAGRAM_CLIENT_ID`: Instagram app ID from the Meta app dashboard.
- `INSTAGRAM_CLIENT_SECRET`: Instagram app secret (server only).
- `INSTAGRAM_REDIRECT_URI`: `https://cholo.meme/api/rewards/connect/instagram/callback`
  (register the exact URL in the Meta app dashboard).

Enable Instagram API with Instagram Login and the `instagram_business_basic`
permission. Complete Meta's required access/review setup before onboarding public
users. Instagram supports Creator/Business accounts; personal-account users can
participate with X. If credentials are absent, the modal explains that Instagram
is unavailable. OAuth tokens are used for identity lookup and are not retained
by new connections. X now requests only `tweet.read users.read`; no follow or
offline access is requested.

References: https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login
