import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const Contact = ({ en }: { en?: boolean }) => (CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <>{en ? "through the support channel in the app" : "pelo canal de suporte informado no aplicativo"}</>);

export default async function Termos() {
  const en = (await getLang()) === "en";
  return (
    <LegalPage title="Termos de Uso">
      {en ? <English /> : <Portuguese />}
    </LegalPage>
  );
}

function Portuguese() {
  return (
    <>
      <h2>1. Aceite</h2>
      <p>Estes Termos regem o uso do ArqIA, plataforma que usa inteligência artificial para gerar mapas de situação, moodboards, renders, variações de iluminação e filmes de projeto. Ao criar uma conta ou usar o serviço, você declara que leu e concorda com estes Termos e com a Política de Privacidade. Se não concordar, não use o serviço.</p>

      <h2>2. O serviço</h2>
      <p>O ArqIA recebe imagens e informações que você envia, processa esses conteúdos com modelos de IA e serviços de terceiros e devolve imagens e vídeos. Os resultados são produzidos automaticamente e podem variar a cada geração.</p>

      <h2>3. Cadastro e conta</h2>
      <ul>
        <li>Você deve ter 18 anos ou mais e capacidade legal para contratar.</li>
        <li>As informações do cadastro devem ser verdadeiras e atualizadas. Para liberar o uso, pedimos que você confirme o seu e-mail pelo link que enviamos.</li>
        <li>Você é responsável pela confidencialidade da sua senha e por tudo o que ocorrer na sua conta. Avise-nos se suspeitar de uso indevido.</li>
        <li>A conta é pessoal e intransferível.</li>
      </ul>

      <h2>4. Créditos, planos e pagamentos</h2>
      <ul>
        <li>As gerações consomem créditos. O custo de cada ação é exibido antes de você gerar. Se uma geração falhar sem entregar resultado, os créditos correspondentes são devolvidos automaticamente.</li>
        <li>Créditos não são moeda, não são transferíveis e não podem ser convertidos em dinheiro, salvo quando a lei exigir.</li>
        <li><strong>Créditos avulsos</strong> são vendidos em pacotes, pagos por Pix ou cartão de crédito, e entram na conta assim que o pagamento é confirmado.</li>
        <li><strong>Planos</strong> são assinaturas mensais pagas somente no cartão de crédito, com renovação automática a cada mês até o cancelamento. Cada plano libera os créditos mensais e os recursos descritos na página de planos; o acúmulo dos créditos mensais não usados é limitado, conforme informado nessa página.</li>
        <li><strong>Cancelamento:</strong> você pode cancelar a renovação a qualquer momento em &quot;Créditos e planos&quot;. O plano continua valendo até o fim do período já pago, e não há novas cobranças depois disso.</li>
        <li><strong>Troca de plano:</strong> ao passar para um plano mais caro, cobramos no cartão a diferença proporcional ao que falta do período atual e liberamos, na mesma proporção, os créditos adicionais do novo plano; a data de renovação não muda. Ao passar para um plano mais barato, a mudança vale a partir da próxima renovação, sem cobrança nem devolução.</li>
        <li><strong>Falha na cobrança:</strong> se a renovação não for paga, o plano termina ao fim do período já pago. Os créditos que você já recebeu continuam na conta.</li>
        <li><strong>Direito de arrependimento:</strong> nas contratações feitas pela internet, você pode desistir em até 7 dias corridos da contratação (art. 49 do Código de Defesa do Consumidor) e pedir o reembolso, descontados os créditos que já tiver consumido. Para isso, fale com o suporte.</li>
        <li>Os pagamentos são processados pelo Asaas. Os dados do cartão são enviados diretamente ao Asaas e não são guardados pelo ArqIA. Preços e condições são exibidos no momento da contratação e podem mudar para novas compras, sem afetar o que você já pagou.</li>
      </ul>

      <h2>5. Conteúdo que você envia</h2>
      <ul>
        <li>Você mantém os direitos sobre as imagens e informações que envia (como prints de modelos 3D, renders, referências e endereços).</li>
        <li>Você declara ter os direitos necessários sobre esse conteúdo, inclusive projetos, imagens de terceiros e referências retiradas da internet, e nos autoriza a armazená-lo e processá-lo, inclusive por meio dos provedores de IA e de infraestrutura descritos na Política de Privacidade, apenas para prestar o serviço a você.</li>
        <li>Não envie conteúdo ilegal, que viole direitos de terceiros, que contenha dados pessoais sensíveis, imagens de crianças ou adolescentes, ou imagens de pessoas identificáveis sem a autorização delas.</li>
      </ul>

      <h2>6. Resultados gerados por IA</h2>
      <ul>
        <li>Os resultados são ilustrativos. Podem conter imprecisões, alterações de geometria, proporções, materiais e detalhes em relação ao projeto original, e não há garantia de fidelidade.</li>
        <li>Resultados gerados por IA podem ser semelhantes entre si ou a obras existentes, e o enquadramento jurídico de direitos autorais sobre eles é incerto. Não garantimos exclusividade nem registrabilidade.</li>
        <li>Entre você e o ArqIA, você pode usar os resultados gerados a partir do seu conteúdo para fins profissionais, observados estes Termos, os termos dos provedores de terceiros e a legislação aplicável.</li>
      </ul>

      <h2>7. Responsabilidade técnica do arquiteto</h2>
      <p>A IA não substitui a responsabilidade técnica e legal do profissional habilitado. Projetos, medidas, normas, memoriais, documentos técnicos e qualquer informação apresentada a clientes e a órgãos públicos continuam sob responsabilidade exclusiva do arquiteto ou profissional que os assina. Confira todo resultado antes de apresentá-lo ou utilizá-lo.</p>

      <h2>8. Serviços de terceiros</h2>
      <ul>
        <li>O serviço usa provedores como Google (modelos Gemini e Google Maps Platform), Supabase (armazenamento), Asaas (pagamentos), Resend (envio de e-mails) e provedores de hospedagem. Os termos e políticas desses provedores também se aplicam ao que cada um faz.</li>
        <li>As imagens de satélite vêm da Google Maps Platform e estão sujeitas aos Termos de Serviço da Google Maps Platform, inclusive à atribuição exigida. Você é responsável por usar essas imagens somente de forma permitida por esses termos. Se você enviar o seu próprio print de mapas ou de satélite, a conformidade com os termos do provedor de origem também é sua.</li>
      </ul>

      <h2>9. Uso permitido</h2>
      <p>É proibido: usar o serviço para fins ilícitos ou para gerar conteúdo que viole direitos de terceiros; tentar burlar limites, créditos ou controles de segurança; acessar contas ou dados de outros usuários; fazer engenharia reversa; automatizar o uso de forma abusiva; ou revender o acesso sem autorização. Para proteger o serviço, aplicamos limites de uso por conta e por endereço de rede.</p>

      <h2>10. Disponibilidade e mudanças no serviço</h2>
      <p>O serviço é fornecido no estado em que se encontra, pode ficar indisponível para manutenção ou por falhas de terceiros e pode ser alterado, inclusive os modelos de IA usados, limites e custos em créditos. Faremos esforços razoáveis para avisar mudanças relevantes.</p>

      <h2>11. Propriedade intelectual do ArqIA</h2>
      <p>O software, a marca, o design, os modelos de moodboard e os demais elementos do ArqIA pertencem aos seus titulares e não são cedidos a você, exceto o direito de uso do serviço conforme estes Termos.</p>

      <h2>12. Limitação de responsabilidade</h2>
      <p>Na máxima extensão permitida pela lei, o ArqIA não responde por decisões de projeto, erros em resultados gerados por IA, perdas indiretas, lucros cessantes ou danos decorrentes de indisponibilidade de serviços de terceiros. Nada nestes Termos limita direitos que a lei considere irrenunciáveis, inclusive os do consumidor.</p>

      <h2>13. Suspensão e encerramento</h2>
      <p>Podemos suspender ou encerrar contas que violem estes Termos ou a lei, mediante aviso quando possível. Você pode parar de usar o serviço e pedir a exclusão da sua conta a qualquer momento, conforme a Política de Privacidade.</p>

      <h2>14. Alterações destes Termos</h2>
      <p>Podemos atualizar estes Termos. Quando a mudança for relevante, pediremos um novo aceite ou avisaremos antes de ela valer. O uso após a mudança indica concordância com a nova versão.</p>

      <h2>15. Lei aplicável e foro</h2>
      <p>Estes Termos são regidos pelas leis do Brasil. Para consumidores, fica eleito o foro do domicílio do usuário; nos demais casos, o foro da comarca do responsável pelo serviço.</p>

      <h2>16. Contato</h2>
      <p>Dúvidas sobre estes Termos: <Contact />.</p>
    </>
  );
}

function English() {
  return (
    <>
      <h2>1. Acceptance</h2>
      <p>These Terms govern the use of ArqIA, a platform that uses artificial intelligence to generate site maps, moodboards, renders, lighting variations and project films. By creating an account or using the service, you state that you have read and agree to these Terms and to the Privacy Policy. If you do not agree, do not use the service.</p>

      <h2>2. The service</h2>
      <p>ArqIA receives the images and information you send, processes them with AI models and third-party services, and returns images and videos. Results are produced automatically and may vary from one generation to the next.</p>

      <h2>3. Registration and account</h2>
      <ul>
        <li>You must be at least 18 years old and legally able to enter into contracts.</li>
        <li>Registration information must be accurate and up to date. To unlock the service, we ask you to confirm your email through the link we send you.</li>
        <li>You are responsible for keeping your password confidential and for everything that happens on your account. Tell us if you suspect misuse.</li>
        <li>The account is personal and cannot be transferred.</li>
      </ul>

      <h2>4. Credits, plans and payments</h2>
      <ul>
        <li>Generations consume credits. The cost of each action is shown before you generate. If a generation fails without delivering a result, the corresponding credits are automatically refunded.</li>
        <li>Credits are not currency, are not transferable and cannot be exchanged for money, except where the law requires it.</li>
        <li><strong>Standalone credits</strong> are sold in packs, paid by Pix or credit card, and are added to your account as soon as the payment is confirmed.</li>
        <li><strong>Plans</strong> are monthly subscriptions paid by credit card only, renewing automatically every month until cancelled. Each plan provides the monthly credits and features described on the plans page; carry-over of unused monthly credits is limited, as stated on that page.</li>
        <li><strong>Cancellation:</strong> you can cancel renewal at any time under &quot;Credits and plans&quot;. The plan stays valid until the end of the period already paid, and no further charges are made after that.</li>
        <li><strong>Changing plans:</strong> when you move to a more expensive plan, we charge your card the difference, prorated to the time left in the current period, and release the new plan&apos;s extra credits in the same proportion; the renewal date does not change. When you move to a cheaper plan, the change takes effect at the next renewal, with no charge or refund.</li>
        <li><strong>Failed charges:</strong> if a renewal is not paid, the plan ends at the end of the period already paid. Credits you have already received stay in your account.</li>
        <li><strong>Right of withdrawal:</strong> for purchases made online, you may withdraw within 7 calendar days of the purchase (art. 49 of the Brazilian Consumer Protection Code) and request a refund, minus any credits you have already used. To do so, contact support.</li>
        <li>Payments are processed by Asaas. Card data is sent directly to Asaas and is not stored by ArqIA. Prices and conditions are shown at the time of purchase and may change for new purchases, without affecting what you have already paid.</li>
      </ul>

      <h2>5. Content you send</h2>
      <ul>
        <li>You keep the rights to the images and information you send (such as 3D model screenshots, renders, references and addresses).</li>
        <li>You state that you hold the necessary rights to this content, including projects, third-party images and references taken from the internet, and you authorize us to store and process it, including through the AI and infrastructure providers described in the Privacy Policy, only to provide the service to you.</li>
        <li>Do not send content that is unlawful, infringes third-party rights, contains sensitive personal data, shows children or teenagers, or shows identifiable people without their permission.</li>
      </ul>

      <h2>6. AI-generated results</h2>
      <ul>
        <li>Results are illustrative. They may contain inaccuracies and changes to geometry, proportions, materials and details compared with the original project, and fidelity is not guaranteed.</li>
        <li>AI-generated results may resemble one another or existing works, and the legal treatment of copyright in them is uncertain. We do not guarantee exclusivity or registrability.</li>
        <li>As between you and ArqIA, you may use results generated from your content for professional purposes, subject to these Terms, the terms of third-party providers and applicable law.</li>
      </ul>

      <h2>7. The architect&apos;s technical responsibility</h2>
      <p>AI does not replace the technical and legal responsibility of the licensed professional. Projects, measurements, standards, specifications, technical documents and any information presented to clients and public authorities remain the sole responsibility of the architect or professional who signs them. Check every result before presenting or using it.</p>

      <h2>8. Third-party services</h2>
      <ul>
        <li>The service uses providers such as Google (Gemini models and Google Maps Platform), Supabase (storage), Asaas (payments), Resend (email delivery) and hosting providers. These providers&apos; terms and policies also apply to what each of them does.</li>
        <li>Satellite images come from Google Maps Platform and are subject to the Google Maps Platform Terms of Service, including the required attribution. You are responsible for using these images only as those terms allow. If you upload your own map or satellite screenshot, compliance with the source provider&apos;s terms is also yours.</li>
      </ul>

      <h2>9. Permitted use</h2>
      <p>You may not: use the service for unlawful purposes or to generate content that infringes third-party rights; try to bypass limits, credits or security controls; access other users&apos; accounts or data; reverse engineer the service; automate use abusively; or resell access without authorization. To protect the service, we apply usage limits per account and per network address.</p>

      <h2>10. Availability and changes to the service</h2>
      <p>The service is provided as is, may be unavailable for maintenance or because of third-party failures, and may change, including the AI models used, limits and credit costs. We will make reasonable efforts to notify you of relevant changes.</p>

      <h2>11. ArqIA&apos;s intellectual property</h2>
      <p>The software, brand, design, moodboard templates and other ArqIA elements belong to their owners and are not assigned to you, except for the right to use the service under these Terms.</p>

      <h2>12. Limitation of liability</h2>
      <p>To the maximum extent permitted by law, ArqIA is not liable for design decisions, errors in AI-generated results, indirect losses, lost profits or damages arising from the unavailability of third-party services. Nothing in these Terms limits rights that the law treats as non-waivable, including consumer rights.</p>

      <h2>13. Suspension and termination</h2>
      <p>We may suspend or terminate accounts that violate these Terms or the law, with notice where possible. You may stop using the service and request deletion of your account at any time, as described in the Privacy Policy.</p>

      <h2>14. Changes to these Terms</h2>
      <p>We may update these Terms. When a change is significant, we will ask for new acceptance or notify you before it takes effect. Continuing to use the service after a change means you agree to the new version.</p>

      <h2>15. Governing law and venue</h2>
      <p>These Terms are governed by the laws of Brazil. For consumers, the courts of the user&apos;s place of residence are chosen; in other cases, the courts of the district of the party responsible for the service.</p>

      <h2>16. Contact</h2>
      <p>Questions about these Terms: <Contact en />.</p>
    </>
  );
}
