import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Política de Privacidade — ArqIA" };

export default function Privacidade() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>Esta Política explica como o ArqIA trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, a LGPD).</p>

      <h2>1. Quem trata os seus dados</h2>
      <p>O controlador dos dados é o responsável pela operação do ArqIA. Para falar sobre privacidade, use o contato indicado na seção 11.</p>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail e senha (guardada apenas em forma de hash, nunca em texto). No login com Google, recebemos nome, e-mail e identificador da conta Google.</li>
        <li><strong>Conteúdo que você envia e recebe:</strong> imagens (prints de modelos 3D, renders, referências, moodboards), endereços digitados, instruções de texto e as imagens e vídeos gerados.</li>
        <li><strong>Uso do serviço:</strong> histórico de gerações, saldo e extrato de créditos, e registros de aceite destes documentos (data e versão).</li>
        <li><strong>Dados técnicos:</strong> cookie de sessão e registros técnicos de funcionamento e segurança do servidor.</li>
      </ul>

      <h2>3. Para que usamos e em que base legal</h2>
      <ul>
        <li><strong>Prestar o serviço</strong> (criar a conta, gerar os resultados, controlar créditos e histórico): execução de contrato.</li>
        <li><strong>Segurança, prevenção a fraudes e abuso:</strong> legítimo interesse.</li>
        <li><strong>Cumprir obrigações legais e regulatórias</strong> (incluindo fiscais e de cobrança): obrigação legal.</li>
        <li><strong>Comunicações sobre o serviço</strong> e, quando houver, comunicações de marketing: legítimo interesse ou consentimento, conforme o caso. Você pode retirar o consentimento quando quiser.</li>
      </ul>

      <h2>4. Com quem compartilhamos</h2>
      <p>Compartilhamos dados apenas na medida necessária, com operadores e parceiros que nos ajudam a prestar o serviço:</p>
      <ul>
        <li><strong>Google</strong> (API Gemini, para gerar imagens e vídeos, e Google Maps Platform, para imagens de satélite): recebem o conteúdo e os endereços enviados para cada geração.</li>
        <li><strong>Supabase</strong>: banco de dados e armazenamento de arquivos.</li>
        <li><strong>Provedor de hospedagem</strong> do aplicativo.</li>
        <li><strong>Provedores de pagamento</strong> (quando a cobrança for disponibilizada) e, se você usar, o <strong>login com Google</strong>.</li>
        <li>Autoridades, quando houver obrigação legal ou ordem válida.</li>
      </ul>
      <p>Não vendemos seus dados pessoais. O tratamento feito por cada provedor segue os termos e as políticas dele.</p>

      <h2>5. Transferência internacional</h2>
      <p>Alguns provedores podem processar dados fora do Brasil. Nesses casos, buscamos que a transferência ocorra com as garantias previstas na LGPD.</p>

      <h2>6. Cookies</h2>
      <p>Usamos apenas um cookie essencial de sessão, necessário para manter você conectado. Não usamos cookies de publicidade.</p>

      <h2>7. Armazenamento e retenção</h2>
      <p>Mantemos os dados enquanto sua conta estiver ativa e pelo tempo necessário para cumprir obrigações legais e resolver disputas. Você pode pedir a exclusão da conta e do conteúdo associado, ressalvados os dados que devamos guardar por lei.</p>

      <h2>8. Seus direitos</h2>
      <p>Nos termos do art. 18 da LGPD, você pode pedir: confirmação do tratamento; acesso; correção; anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei; portabilidade; informação sobre compartilhamentos; revogação do consentimento; e revisão de decisões automatizadas. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>

      <h2>9. Segurança</h2>
      <p>Adotamos medidas técnicas e organizacionais razoáveis, como senhas protegidas por hash, acesso aos arquivos por links temporários e chaves de serviço mantidas apenas no servidor. Nenhum sistema é totalmente imune a incidentes; em caso de incidente relevante, comunicaremos você e a ANPD conforme a lei.</p>

      <h2>10. Menores de idade</h2>
      <p>O ArqIA é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de crianças e adolescentes, e não devem ser enviadas imagens delas.</p>

      <h2>11. Contato e alterações</h2>
      <p>Para exercer seus direitos ou tirar dúvidas: {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : "pelo canal de suporte informado no aplicativo"}. Podemos atualizar esta Política; mudanças relevantes serão informadas e, quando necessário, pediremos novo aceite.</p>
    </LegalPage>
  );
}
