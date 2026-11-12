import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const Contact = ({ en }: { en?: boolean }) => (CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <>{en ? "through the support channel in the app" : "pelo canal de suporte informado no aplicativo"}</>);

export default async function Privacidade() {
  const en = (await getLang()) === "en";
  return (
    <LegalPage title="Política de Privacidade">
      {en ? <English /> : <Portuguese />}
    </LegalPage>
  );
}

function Portuguese() {
  return (
    <>
      <p>Esta Política explica como o ArqIA trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, a LGPD).</p>

      <h2>1. Quem trata os seus dados</h2>
      <p>O controlador dos dados é o responsável pela operação do ArqIA. Para falar sobre privacidade, use o contato indicado na seção 11.</p>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail e senha (guardada apenas em forma de hash, nunca em texto). No login com Google, recebemos nome, e-mail e identificador da conta Google. Também registramos se e quando você confirmou o e-mail.</li>
        <li><strong>Conteúdo que você envia e recebe:</strong> imagens (prints de modelos 3D, renders, referências, moodboards), endereços digitados, instruções de texto e as imagens e vídeos gerados.</li>
        <li><strong>Uso do serviço:</strong> histórico de gerações, saldo e extrato de créditos, e registros de aceite destes documentos (data e versão).</li>
        <li><strong>Pagamentos:</strong> CPF ou CNPJ, plano e compras realizadas. Os dados do cartão são enviados diretamente ao Asaas e não ficam guardados conosco.</li>
        <li><strong>Dados técnicos:</strong> cookie de sessão, endereço de rede (IP) usado para limitar abusos e prevenir fraudes, e registros técnicos de funcionamento e segurança do servidor.</li>
      </ul>

      <h2>3. Para que usamos e em que base legal</h2>
      <ul>
        <li><strong>Prestar o serviço</strong> (criar a conta, confirmar o e-mail, gerar os resultados, controlar créditos, planos e histórico, enviar e-mails de confirmação e de recuperação de senha): execução de contrato.</li>
        <li><strong>Segurança, prevenção a fraudes e abuso:</strong> legítimo interesse.</li>
        <li><strong>Cumprir obrigações legais e regulatórias</strong> (incluindo fiscais e de cobrança): obrigação legal.</li>
        <li><strong>Comunicações sobre o serviço</strong> e, quando houver, comunicações de marketing: legítimo interesse ou consentimento, conforme o caso. Você pode retirar o consentimento quando quiser.</li>
      </ul>

      <h2>4. Com quem compartilhamos</h2>
      <p>Compartilhamos dados apenas na medida necessária, com operadores e parceiros que nos ajudam a prestar o serviço:</p>
      <ul>
        <li><strong>Google</strong> (API Gemini, para gerar imagens e vídeos, e Google Maps Platform, para imagens de satélite): recebem o conteúdo e os endereços enviados para cada geração. Também é a Google que fornece o login com Google, se você o usar.</li>
        <li><strong>Supabase</strong>: banco de dados e armazenamento de arquivos.</li>
        <li><strong>Asaas</strong>: processa pagamentos e assinaturas. Recebe nome, e-mail, CPF ou CNPJ, dados do cartão e o IP da compra.</li>
        <li><strong>Resend</strong>: envia os e-mails do serviço (confirmação de e-mail e recuperação de senha). Recebe seu nome e e-mail.</li>
        <li><strong>Provedor de hospedagem</strong> do aplicativo.</li>
        <li>Autoridades, quando houver obrigação legal ou ordem válida.</li>
      </ul>
      <p>Não vendemos seus dados pessoais. O tratamento feito por cada provedor segue os termos e as políticas dele.</p>

      <h2>5. Transferência internacional</h2>
      <p>Alguns provedores podem processar dados fora do Brasil. Nesses casos, buscamos que a transferência ocorra com as garantias previstas na LGPD.</p>

      <h2>6. Cookies</h2>
      <p>Usamos apenas cookies essenciais: o de sessão, que mantém você conectado, e os de preferência de idioma e de tema. Não usamos cookies de publicidade.</p>

      <h2>7. Armazenamento e retenção</h2>
      <p>Mantemos os dados enquanto sua conta estiver ativa e pelo tempo necessário para cumprir obrigações legais e resolver disputas. Registros de pagamento podem ser mantidos pelo prazo exigido pela legislação fiscal. Você pode pedir a exclusão da conta e do conteúdo associado, ressalvados os dados que devamos guardar por lei.</p>

      <h2>8. Seus direitos</h2>
      <p>Nos termos do art. 18 da LGPD, você pode pedir: confirmação do tratamento; acesso; correção; anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei; portabilidade; informação sobre compartilhamentos; revogação do consentimento; e revisão de decisões automatizadas. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>

      <h2>9. Segurança</h2>
      <p>Adotamos medidas técnicas e organizacionais razoáveis, como senhas protegidas por hash, links de e-mail assinados e com validade, acesso aos arquivos por links temporários e chaves de serviço mantidas apenas no servidor. Nenhum sistema é totalmente imune a incidentes; em caso de incidente relevante, comunicaremos você e a ANPD conforme a lei.</p>

      <h2>10. Menores de idade</h2>
      <p>O ArqIA é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de crianças e adolescentes, e não devem ser enviadas imagens delas.</p>

      <h2>11. Contato e alterações</h2>
      <p>Para exercer seus direitos ou tirar dúvidas: <Contact />. Podemos atualizar esta Política; mudanças relevantes serão informadas e, quando necessário, pediremos novo aceite.</p>
    </>
  );
}

function English() {
  return (
    <>
      <p>This Policy explains how ArqIA handles personal data, in accordance with the Brazilian General Data Protection Law (Law No. 13,709/2018, the LGPD).</p>

      <h2>1. Who processes your data</h2>
      <p>The data controller is the party responsible for operating ArqIA. For privacy matters, use the contact given in section 11.</p>

      <h2>2. Data we collect</h2>
      <ul>
        <li><strong>Registration:</strong> name, email and password (stored only as a hash, never as text). When you sign in with Google, we receive your name, email and Google account identifier. We also record whether and when you confirmed your email.</li>
        <li><strong>Content you send and receive:</strong> images (3D model screenshots, renders, references, moodboards), typed addresses, text instructions, and the images and videos generated.</li>
        <li><strong>Use of the service:</strong> generation history, credit balance and statement, and records of your acceptance of these documents (date and version).</li>
        <li><strong>Payments:</strong> CPF or CNPJ (Brazilian tax ID), plan and purchases made. Card data is sent directly to Asaas and is not stored by us.</li>
        <li><strong>Technical data:</strong> session cookie, network address (IP) used to limit abuse and prevent fraud, and technical operation and security logs of the server.</li>
      </ul>

      <h2>3. What we use it for and the legal basis</h2>
      <ul>
        <li><strong>Providing the service</strong> (creating the account, confirming the email, generating results, managing credits, plans and history, sending confirmation and password-recovery emails): performance of a contract.</li>
        <li><strong>Security, fraud and abuse prevention:</strong> legitimate interest.</li>
        <li><strong>Complying with legal and regulatory obligations</strong> (including tax and billing): legal obligation.</li>
        <li><strong>Service communications</strong> and, if any, marketing communications: legitimate interest or consent, as the case may be. You can withdraw consent at any time.</li>
      </ul>

      <h2>4. Who we share it with</h2>
      <p>We share data only as needed, with processors and partners that help us provide the service:</p>
      <ul>
        <li><strong>Google</strong> (Gemini API, to generate images and videos, and Google Maps Platform, for satellite images): they receive the content and addresses sent for each generation. Google also provides Google sign-in, if you use it.</li>
        <li><strong>Supabase</strong>: database and file storage.</li>
        <li><strong>Asaas</strong>: processes payments and subscriptions. It receives name, email, CPF or CNPJ, card data and the purchase IP.</li>
        <li><strong>Resend</strong>: sends the service&apos;s emails (email confirmation and password recovery). It receives your name and email.</li>
        <li><strong>Hosting provider</strong> of the application.</li>
        <li>Authorities, when there is a legal obligation or a valid order.</li>
      </ul>
      <p>We do not sell your personal data. Each provider&apos;s processing follows its own terms and policies.</p>

      <h2>5. International transfers</h2>
      <p>Some providers may process data outside Brazil. In these cases, we seek to ensure the transfer takes place with the safeguards provided by the LGPD.</p>

      <h2>6. Cookies</h2>
      <p>We use only essential cookies: the session cookie, which keeps you signed in, and the language and theme preference cookies. We do not use advertising cookies.</p>

      <h2>7. Storage and retention</h2>
      <p>We keep data while your account is active and for as long as needed to meet legal obligations and resolve disputes. Payment records may be kept for the period required by tax law. You can request deletion of your account and associated content, except for data we must keep by law.</p>

      <h2>8. Your rights</h2>
      <p>Under article 18 of the LGPD, you may request: confirmation of processing; access; correction; anonymization, blocking or deletion of unnecessary data or data processed in breach of the law; portability; information about sharing; withdrawal of consent; and review of automated decisions. You may also file a complaint with the Brazilian National Data Protection Authority (ANPD).</p>

      <h2>9. Security</h2>
      <p>We adopt reasonable technical and organizational measures, such as hashed passwords, signed and expiring email links, access to files through temporary links, and service keys kept only on the server. No system is completely immune to incidents; in the event of a relevant incident, we will notify you and the ANPD as required by law.</p>

      <h2>10. Minors</h2>
      <p>ArqIA is intended for people over 18. We do not knowingly collect data from children or teenagers, and images of them should not be uploaded.</p>

      <h2>11. Contact and changes</h2>
      <p>To exercise your rights or ask questions: <Contact en />. We may update this Policy; relevant changes will be announced and, when necessary, we will ask for new acceptance.</p>
    </>
  );
}
