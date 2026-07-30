import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad | $CHOLO",
  description: "Cómo $CHOLO recopila, utiliza, protege y comparte información.",
};

const sections = [
  {
    title: "1. Información que recopilamos",
    paragraphs: [
      "Dependiendo de cómo utilices CHOLO, podemos recopilar tu correo electrónico, direcciones públicas de billetera, tipo de billetera, registros de verificación y datos de autenticación. Si creas una billetera administrada por CHOLO, almacenamos un respaldo cifrado y la información técnica necesaria para restaurarlo.",
      "También podemos recibir la información que decidas publicar, como tu nombre o usuario, biografía, ubicación, enlaces, datos de contacto, imágenes, comentarios y otras contribuciones.",
      "Recopilamos información técnica básica en forma encriptada, que puede incluir dirección IP, navegador, dispositivo, registros de solicitudes, errores y almacenamiento local utilizado para mantener tu sesión y recordar preferencias.",
    ],
  },
  {
    title: "2. Claves privadas y frases de recuperación",
    paragraphs: [
      "No nos envíes tu frase de recuperación ni tu clave privada. Las billeteras externas firman transacciones sin compartir intencionalmente esos secretos con CHOLO. Cuando utilizas una billetera cifrada de CHOLO, el cifrado y descifrado se realizan con las credenciales que proporcionas, pero sigues siendo responsable de conservar una copia segura de tu frase de recuperación.",
    ],
  },
  {
    title: "3. Cómo utilizamos la información",
    paragraphs: [
      "Utilizamos la información para proporcionar, proteger, mantener y mejorar CHOLO; crear cuentas; verificar correos; restaurar respaldos cifrados; mostrar el contenido que solicites publicar; procesar interacciones con billeteras; responder consultas de soporte; y detectar fraude, abuso, incidentes de seguridad o infracciones de nuestros términos.",
      "Podemos enviarte mensajes necesarios para operar o proteger tu cuenta. Solo enviaremos comunicaciones promocionales cuando tengamos una base legal para hacerlo, y podrás dejar de recibirlas mediante el enlace incluido en el mensaje o contactándonos.",
    ],
  },
  {
    title: "4. Información pública y blockchain",
    paragraphs: [
      "Las direcciones públicas, saldos, transacciones y otros datos registrados en Bitcoin, Stacks u otras redes públicas pueden ser visibles mundialmente. La información publicada en una blockchain o en sistemas distribuidos como IPFS puede ser permanente y quedar fuera del control de CHOLO.",
      "No publiques en una transacción, perfil público o sistema distribuido información personal que quieras mantener privada. Aunque eliminemos una referencia desde nuestra interfaz, es posible que no podamos borrar sus copias de una red pública.",
    ],
  },
  {
    title: "5. Cuándo compartimos información",
    paragraphs: [
      "No vendemos tu información personal. Podemos compartirla con proveedores que nos ayudan a operar el servicio, como servicios de alojamiento, base de datos, almacenamiento, correo, conexión de billeteras y acceso a infraestructura blockchain. Estos proveedores solo reciben la información necesaria para prestar sus servicios y están sujetos a sus propios compromisos de privacidad y seguridad.",
    ],
  },
  {
    title: "6. Cookies y almacenamiento local",
    paragraphs: [
      "CHOLO puede utilizar cookies y almacenamiento del navegador para conservar sesiones, preferencias de idioma o tema, estado de conexión y datos cifrados de una billetera local. Puedes borrar estos datos desde la configuración de tu navegador, aunque hacerlo puede cerrar tu sesión o eliminar información local necesaria para ciertas funciones.",
    ],
  },
  {
    title: "7. Conservación y transferencias",
    paragraphs: [
      "Conservamos la información durante el tiempo necesario para ofrecer CHOLO, cumplir obligaciones legales y de seguridad, resolver disputas y hacer cumplir acuerdos. El plazo depende del tipo de registro. Los datos públicos almacenados en blockchains o IPFS pueden permanecer disponibles indefinidamente.",
      "La información puede procesarse en países distintos al tuyo. Cuando corresponda, aplicaremos medidas razonables para protegerla durante esas transferencias.",
    ],
  },
  {
    title: "8. Seguridad",
    paragraphs: [
      "Aplicamos medidas administrativas y técnicas razonables, incluido el cifrado de respaldos de billeteras administradas por CHOLO. Ningún sistema conectado a internet es completamente seguro y no podemos garantizar protección absoluta. Eres responsable de proteger tu contraseña, dispositivos, credenciales de billetera y frase de recuperación.",
    ],
  },
  {
    title: "9. Tus opciones y derechos",
    paragraphs: [
      "Puedes editar la información de tu perfil, desconectar tu billetera y borrar datos locales desde tu navegador. Dependiendo de dónde vivas, también puedes tener derecho a solicitar acceso, corrección, eliminación, restricción, oposición o una copia de tu información personal.",
      "Para realizar una solicitud, escríbenos a la dirección indicada al final de esta política. Es posible que debamos verificar tu identidad o el control de la billetera relacionada. No podemos eliminar registros controlados por una blockchain pública, IPFS o un tercero independiente.",
    ],
  },
  {
    title: "10. Privacidad de menores",
    paragraphs: [
      "CHOLO no está dirigido a menores de 13 años y no recopilamos deliberadamente su información personal. Si crees que un menor nos proporcionó información personal, contáctanos para que podamos revisarla y tomar las medidas correspondientes.",
    ],
  },
  {
    title: "11. Cambios a esta política",
    paragraphs: [
      "Podemos actualizar esta política a medida que CHOLO evoluciona. Publicaremos aquí la versión revisada y modificaremos la fecha de vigencia. Los cambios importantes también podrán anunciarse mediante el servicio.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="cholo-site min-h-screen">
      <article className="cholo-shell pb-24 pt-44 sm:pt-48">
        <header className="max-w-3xl border-b border-[#c18b4e]/40 pb-10">
          <p className="cholo-kicker">Legal / Privacidad</p>
          <h1 className="font-serif text-5xl font-black tracking-[-0.04em] text-[#faeed5] sm:text-7xl">
            Política de privacidad
          </h1>
          <p className="mt-6 text-sm uppercase tracking-[0.12em] text-[#a38870]">
            Vigente desde el 29 de julio de 2026
          </p>
        </header>

        <div className="mt-12 max-w-3xl space-y-12">
          <p className="border-l-4 border-[#b7132f] pl-6 text-lg leading-8 text-[#c8b39a]">
            Esta política explica cómo CHOLO recopila, utiliza, comparte y protege información cuando utilizas cholo.meme y los servicios relacionados.
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
            <h2 className="font-serif text-2xl font-bold text-[#faeed5]">Contacto</h2>
            <p className="mt-4 leading-8 text-[#c8b39a]">
              Para preguntas o solicitudes relacionadas con tu privacidad, escribe a{" "}
              <a className="text-[#dc3452] underline underline-offset-4" href="mailto:40230@pm.me">40230@pm.me</a>.
              Consulta también nuestros{" "}
              <Link className="text-[#dc3452] underline underline-offset-4" href="/terms">Términos de servicio</Link>.
            </p>
          </section>

          <Link className="cholo-button cholo-button-outline" href="/">← Volver al inicio</Link>
        </div>
      </article>
    </div>
  );
}
