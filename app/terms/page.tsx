import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos de servicio | $CHOLO",
  description: "Términos que regulan el uso del sitio, la billetera y los servicios de $CHOLO.",
};

const sections = [
  {
    title: "1. Aceptación de los términos",
    paragraphs: [
      "Estos Términos de servicio regulan tu acceso y uso de cholo.meme, sus interfaces, herramientas de billetera y servicios relacionados (en conjunto, \"CHOLO\"). Al acceder a CHOLO, conectar una billetera o crear una cuenta, aceptas estos términos. Si no estás de acuerdo, no utilices el servicio.",
      "Debes tener capacidad legal para celebrar este acuerdo en tu jurisdicción. Si utilizas CHOLO en nombre de una organización, declaras que tienes autoridad para obligarla a estos términos.",
    ],
  },
  {
    title: "2. Naturaleza del servicio",
    paragraphs: [
      "CHOLO ofrece software para interactuar con redes y activos digitales. Algunas funciones permiten conectar billeteras de terceros, crear una billetera cifrada localmente, consultar información pública y preparar o transmitir transacciones. CHOLO no es un banco, custodio, corredor, asesor financiero ni casa de cambio.",
      "$CHOLO es un token meme creado con fines culturales, comunitarios y educativos. No representa acciones, deuda, participación en beneficios ni una promesa de rendimiento financiero. Nada en CHOLO constituye asesoría financiera, legal, tributaria o de inversión.",
    ],
  },
  {
    title: "3. Billeteras, claves y seguridad",
    paragraphs: [
      "Eres responsable de tus dispositivos, contraseñas, frases de recuperación, claves privadas y de verificar cada transacción antes de firmarla. Nunca compartas una frase de recuperación o clave privada con CHOLO. Quien tenga acceso a ellas puede controlar tus activos.",
      "Cuando utilizas una billetera administrada por CHOLO, el respaldo se almacena cifrado. Aun así, debes conservar tu propia frase de recuperación. No podemos recuperar activos, revertir firmas ni garantizar acceso si pierdes tus credenciales, tu dispositivo o tu copia de seguridad.",
    ],
  },
  {
    title: "4. Redes y transacciones",
    paragraphs: [
      "Las transacciones se procesan en redes públicas independientes de CHOLO. Una vez transmitidas, pueden ser irreversibles y estar sujetas a comisiones, demoras, congestión, reorganizaciones, fallas de contratos inteligentes o cambios de protocolo. Tú asumes esos riesgos y eres responsable de comprobar la red, el activo, la dirección y el importe.",
      "Los datos mostrados por CHOLO pueden provenir de nodos, exploradores, proveedores de precios u otros terceros. Procuramos ofrecer información útil, pero no garantizamos que sea completa, exacta o actualizada.",
    ],
  },
  {
    title: "5. Uso permitido",
    paragraphs: [
      "No puedes usar CHOLO para infringir leyes, vulnerar derechos de terceros, distribuir malware, suplantar identidades, evadir sanciones aplicables, lavar activos, financiar actividades ilícitas, manipular mercados, interferir con la seguridad del servicio o intentar acceder sin autorización a cuentas, sistemas o datos.",
      "Podemos limitar o suspender el acceso a componentes alojados por nosotros cuando sea razonablemente necesario para proteger a usuarios, cumplir la ley o responder a abuso o riesgos de seguridad. No controlamos ni podemos eliminar actividad ya registrada en una blockchain pública.",
    ],
  },
  {
    title: "6. Contenido y propiedad intelectual",
    paragraphs: [
      "Conservas los derechos sobre el contenido que proporcionas. Nos otorgas una licencia mundial, no exclusiva y libre de regalías para alojarlo, reproducirlo y mostrarlo solo en la medida necesaria para operar, mejorar y promocionar CHOLO. No publiques contenido que no tengas derecho a utilizar.",
      "El software de CHOLO puede incluir componentes de código abierto sujetos a sus propias licencias. Las marcas, diseños y contenido que no se publiquen bajo una licencia abierta pertenecen a sus respectivos titulares y no se conceden derechos implícitos sobre ellos.",
    ],
  },
  {
    title: "7. Servicios de terceros",
    paragraphs: [
      "CHOLO puede enlazar o integrarse con billeteras, redes, protocolos, intercambios y servicios de terceros. Sus propios términos y políticas se aplican cuando los utilizas. No controlamos esos servicios ni respondemos por su disponibilidad, seguridad, contenido o acciones.",
    ],
  },
  {
    title: "8. Renuncia de garantías",
    paragraphs: [
      "CHOLO se proporciona \"tal cual\" y \"según disponibilidad\". En la máxima medida permitida por la ley, no ofrecemos garantías expresas o implícitas de disponibilidad, comerciabilidad, adecuación a un propósito, no infracción, seguridad o ausencia de errores. El software y los activos digitales son experimentales y pueden perder valor o dejar de funcionar.",
    ],
  },
  {
    title: "9. Limitación de responsabilidad",
    paragraphs: [
      "En la máxima medida permitida por la ley, CHOLO, sus desarrolladores y colaboradores no serán responsables por daños indirectos, incidentales, especiales, consecuentes o punitivos, lucro cesante, pérdida de datos, credenciales o activos, ni por daños derivados de redes, contratos inteligentes, terceros o acceso no autorizado.",
      "Nada en estos términos excluye responsabilidades que legalmente no puedan excluirse. Algunas jurisdicciones no permiten ciertas limitaciones, por lo que pueden no aplicarse en tu caso.",
    ],
  },
  {
    title: "10. Cambios y terminación",
    paragraphs: [
      "Podemos modificar o discontinuar funciones y actualizar estos términos a medida que CHOLO evoluciona. Publicaremos la versión revisada y cambiaremos la fecha de vigencia. El uso continuado después de una actualización significa que aceptas los nuevos términos.",
      "Puedes dejar de utilizar CHOLO en cualquier momento. Antes de hacerlo, guarda tus frases de recuperación y cualquier información necesaria para acceder a tus activos sin este sitio.",
    ],
  },
  {
    title: "11. Ley aplicable y contacto",
    paragraphs: [
      "Estos términos se rigen por las leyes de la República del Perú, sin perjuicio de las normas obligatorias de protección al consumidor que correspondan en tu lugar de residencia. Antes de iniciar una reclamación formal, te invitamos a contactarnos para intentar resolverla de buena fe.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="cholo-site min-h-screen">
      <article className="cholo-shell pb-24 pt-44 sm:pt-48">
        <header className="max-w-3xl border-b border-[#c18b4e]/40 pb-10">
          <p className="cholo-kicker">Legal / Términos</p>
          <h1 className="font-serif text-5xl font-black tracking-[-0.04em] text-[#faeed5] sm:text-7xl">
            Términos de servicio
          </h1>
          <p className="mt-6 text-sm uppercase tracking-[0.12em] text-[#a38870]">
            Vigentes desde el 29 de julio de 2026
          </p>
        </header>

        <div className="mt-12 max-w-3xl space-y-12">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#faeed5] sm:text-3xl">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-[#c8b39a]">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}

          <section className="border border-[#c18b4e]/40 bg-[#1b1412] p-6 sm:p-8">
            <h2 className="font-serif text-2xl font-bold text-[#faeed5]">Contacto</h2>
            <p className="mt-4 leading-8 text-[#c8b39a]">
              Si tienes preguntas sobre estos términos, escribe a{" "}
              <a className="text-[#dc3452] underline underline-offset-4" href="mailto:40230@pm.me">40230@pm.me</a>.
              Consulta también nuestra{" "}
              <Link className="text-[#dc3452] underline underline-offset-4" href="/privacy">Política de privacidad</Link>.
            </p>
          </section>

          <Link className="cholo-button cholo-button-outline" href="/">← Volver al inicio</Link>
        </div>
      </article>
    </div>
  );
}
