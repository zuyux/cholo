import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y condiciones de recompensa | $CHOLO",
  description: "Condiciones aplicables al programa de recompensa de bienvenida de $CHOLO.",
};

const sections = [
  {
    title: "1. Aceptación",
    paragraphs: [
      "Estos Términos y condiciones de recompensa regulan tu participación en el programa de bienvenida de CHOLO (el \"Programa\"). Al conectar una billetera, autenticar tu cuenta de X o solicitar la recompensa, confirmas que has leído y aceptas estas condiciones, además de los Términos de servicio y la Política de privacidad de CHOLO.",
      "Si no aceptas estas condiciones, no participes en el Programa.",
    ],
  },
  {
    title: "2. Elegibilidad",
    paragraphs: [
      "Para participar debes tener capacidad legal para aceptar estas condiciones en tu jurisdicción, controlar una billetera compatible y una cuenta válida de X, y no estar sujeto a una prohibición legal aplicable. El Programa es nulo donde esté prohibido o restringido por ley.",
      "No se requiere una compra. El acceso a internet, una billetera compatible y el uso de servicios de terceros pueden estar sujetos a sus propios costos o condiciones.",
    ],
  },
  {
    title: "3. Cómo obtener la recompensa",
    paragraphs: [
      "Durante la vigencia del Programa debes conectar tu billetera a CHOLO, autenticar una cuenta de X, seguir la cuenta oficial @cholocoinmeme y completar la solicitud mediante la interfaz de recompensa.",
      "La verificación depende de la información disponible a través de X. Las cuentas privadas, restricciones de la plataforma, demoras, revocaciones de permisos o fallas de terceros pueden impedir o retrasar la comprobación automática.",
    ],
  },
  {
    title: "4. Recompensa y distribución",
    paragraphs: [
      "Cada solicitud elegible puede recibir 1,000 $CHOLOs, sujeto a verificación, disponibilidad y estas condiciones. La interfaz registra una solicitud aprobada; ese registro no garantiza una transferencia inmediata ni una fecha específica de distribución.",
      "La distribución puede requerir comprobaciones adicionales y puede demorarse por mantenimiento, congestión de red, comisiones, incidentes técnicos o causas fuera del control razonable de CHOLO. $CHOLO es un token cultural y experimental; la recompensa no representa dinero en efectivo, una inversión ni una promesa de valor o rendimiento.",
    ],
  },
  {
    title: "5. Límite y prevención de abuso",
    paragraphs: [
      "Se permite una sola recompensa por persona, billetera y cuenta de X. No puedes participar mediante identidades, cuentas o billeteras duplicadas; automatización; información falsa; suplantación; manipulación de verificaciones; ni cualquier otro método diseñado para eludir el límite.",
      "CHOLO puede revisar, rechazar, suspender o anular solicitudes razonablemente asociadas con fraude, abuso, errores técnicos, incumplimiento de estas condiciones o actividad ilícita. También puede solicitar evidencia razonable de control de la billetera o cuenta vinculada, sin pedir nunca tu frase semilla ni clave privada.",
    ],
  },
  {
    title: "6. Billeteras, redes e impuestos",
    paragraphs: [
      "Eres responsable de proporcionar y controlar una dirección compatible, proteger tus credenciales y comprobar cualquier transacción. Las transferencias en redes públicas pueden ser visibles, irreversibles y estar sujetas a riesgos técnicos. CHOLO no responde por recompensas enviadas a una dirección incorrecta proporcionada por el participante ni por la pérdida de acceso a una billetera.",
      "Eres responsable de determinar y cumplir cualquier obligación tributaria, declaración o restricción que corresponda en tu jurisdicción como resultado de participar o recibir tokens.",
    ],
  },
  {
    title: "7. Servicios de terceros",
    paragraphs: [
      "X, proveedores de billeteras, Stacks, Bitcoin y otros servicios relacionados son operados por terceros y se rigen por sus propias condiciones. CHOLO no controla su disponibilidad, decisiones, cambios de API, suspensiones de cuentas ni interrupciones.",
    ],
  },
  {
    title: "8. Vigencia, cambios y cancelación",
    paragraphs: [
      "El Programa estará disponible mientras se muestre como activo en cholo.meme y podrá finalizar cuando se agote la asignación destinada a recompensas. CHOLO puede modificar, pausar o terminar el Programa cuando sea razonablemente necesario por seguridad, fraude, requisitos legales, fallas técnicas o cambios de terceros.",
      "Los cambios materiales se publicarán en esta página. Cuando resulte razonablemente posible, no afectarán solicitudes elegibles ya registradas antes del cambio, salvo que sea necesario para cumplir la ley, corregir un error o responder a fraude o abuso.",
    ],
  },
  {
    title: "9. Privacidad",
    paragraphs: [
      "Para operar y verificar el Programa, CHOLO procesa la dirección pública de tu billetera, el identificador y nombre de usuario de X, credenciales OAuth, estado de seguimiento y registros de solicitud. Consulta la Política de privacidad para obtener más información sobre el uso, conservación y protección de estos datos.",
    ],
  },
  {
    title: "10. Responsabilidad y ley aplicable",
    paragraphs: [
      "En la máxima medida permitida por la ley, el Programa se ofrece tal cual y según disponibilidad. Nada en estas condiciones limita derechos o responsabilidades que legalmente no puedan excluirse.",
      "Estas condiciones se rigen por las leyes de la República del Perú, sin perjuicio de las normas obligatorias que correspondan en tu lugar de residencia. Antes de iniciar una reclamación formal, te invitamos a contactarnos para intentar resolverla de buena fe.",
    ],
  },
];

export default function RewardTermsPage() {
  return (
    <div className="cholo-site min-h-screen">
      <article className="cholo-shell pb-24 pt-44 sm:pt-48">
        <header className="max-w-3xl border-b border-[#c18b4e]/40 pb-10">
          <p className="cholo-kicker">Legal / Recompensas</p>
          <h1 className="font-serif text-5xl font-black tracking-[-0.04em] text-[#faeed5] sm:text-7xl">
            Términos y condiciones de recompensa
          </h1>
          <p className="mt-6 text-sm uppercase tracking-[0.12em] text-[#a38870]">
            Vigentes desde el 30 de julio de 2026
          </p>
        </header>

        <div className="mt-12 max-w-3xl space-y-12">
          <p className="border-l-4 border-[#b7132f] pl-6 text-lg leading-8 text-[#c8b39a]">
            Estas condiciones explican quién puede participar y cómo funciona la recompensa de bienvenida de 1,000 $CHOLOs.
          </p>

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
            <h2 className="font-serif text-2xl font-bold text-[#faeed5]">Contacto y documentos relacionados</h2>
            <p className="mt-4 leading-8 text-[#c8b39a]">
              Si tienes preguntas sobre el Programa, escribe a{" "}
              <a className="text-[#dc3452] underline underline-offset-4" href="mailto:40230@pm.me">40230@pm.me</a>.
              Consulta también los{" "}
              <Link className="text-[#dc3452] underline underline-offset-4" href="/terms">Términos de servicio</Link>{" "}
              y la{" "}
              <Link className="text-[#dc3452] underline underline-offset-4" href="/privacy">Política de privacidad</Link>.
            </p>
          </section>

          <Link className="cholo-button cholo-button-outline" href="/">← Volver al inicio</Link>
        </div>
      </article>
    </div>
  );
}
