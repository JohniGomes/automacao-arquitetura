import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Termos de Uso — ArqIA" };

export default function Termos() {
  return (
    <LegalPage title="Termos de Uso">
      <h2>1. Aceite</h2>
      <p>Estes Termos regem o uso do ArqIA, plataforma que usa inteligência artificial para gerar mapas de situação, moodboards, renders, variações de iluminação e filmes de projeto. Ao criar uma conta ou usar o serviço, você declara que leu e concorda com estes Termos e com a Política de Privacidade. Se não concordar, não use o serviço.</p>

      <h2>2. O serviço</h2>
      <p>O ArqIA recebe imagens e informações que você envia, processa esses conteúdos com modelos de IA e serviços de terceiros e devolve imagens e vídeos. Os resultados são produzidos automaticamente e podem variar a cada geração.</p>

      <h2>3. Cadastro e conta</h2>
      <ul>
        <li>Você deve ter 18 anos ou mais e capacidade legal para contratar.</li>
        <li>As informações do cadastro devem ser verdadeiras e atualizadas.</li>
        <li>Você é responsável pela confidencialidade da sua senha e por tudo o que ocorrer na sua conta. Avise-nos se suspeitar de uso indevido.</li>
        <li>A conta é pessoal e intransferível.</li>
      </ul>

      <h2>4. Créditos e pagamentos</h2>
      <ul>
        <li>As gerações consomem créditos. O custo de cada ação é exibido antes de você gerar.</li>
        <li>Se uma geração falhar sem entregar resultado, os créditos correspondentes são devolvidos automaticamente.</li>
        <li>Créditos não são moeda, não são transferíveis e não podem ser convertidos em dinheiro, salvo quando a lei exigir.</li>
        <li>A compra de créditos e as assinaturas serão disponibilizadas por meio de provedores de pagamento. As condições comerciais (preços, prazos, cancelamento e reembolso) serão informadas no momento da contratação, respeitado o Código de Defesa do Consumidor, inclusive o direito de arrependimento quando aplicável.</li>
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
        <li>O serviço usa provedores como Google (modelos Gemini e Google Maps Platform), Supabase (armazenamento) e provedores de hospedagem e de pagamento. Os termos e políticas desses provedores também se aplicam ao que cada um faz.</li>
        <li>As imagens de satélite vêm da Google Maps Platform e estão sujeitas aos Termos de Serviço da Google Maps Platform, inclusive à atribuição exigida. Você é responsável por usar essas imagens somente de forma permitida por esses termos. Se você enviar o seu próprio print de mapas ou de satélite, a conformidade com os termos do provedor de origem também é sua.</li>
      </ul>

      <h2>9. Uso permitido</h2>
      <p>É proibido: usar o serviço para fins ilícitos ou para gerar conteúdo que viole direitos de terceiros; tentar burlar limites, créditos ou controles de segurança; acessar contas ou dados de outros usuários; fazer engenharia reversa; automatizar o uso de forma abusiva; ou revender o acesso sem autorização.</p>

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
      <p>Dúvidas sobre estes Termos: {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : "pelo canal de suporte informado no aplicativo"}.</p>
    </LegalPage>
  );
}
