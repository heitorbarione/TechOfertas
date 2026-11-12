import { useState } from 'react';
import { CheckCircle2, Mail, Shield, Sparkles } from 'lucide-react';

export function AboutPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-3 border-b border-zinc-800 pb-6">
        <span className="text-xs font-semibold text-yellow-400">Institucional</span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-zinc-50">Sobre o Tech Oferta</h1>
        <p className="text-base text-zinc-300">A tecnologia que você quer, pelo preço que você procura.</p>
      </div>

      <div className="space-y-5 text-sm sm:text-base text-zinc-300 leading-relaxed">
        <p>
          O <strong className="text-zinc-100">Tech Oferta</strong> é um portal independente especializado na curadoria e
          divulgação de ofertas, promoções e lançamentos de tecnologia disponíveis no Mercado Livre.
        </p>
        <p>
          Nosso foco é facilitar a busca por smartphones, notebooks, caixas de som, smartwatches, TVs, periféricos e
          eletrônicos em geral, organizando cada produto por categoria e apresentando informações claras para que você
          tome decisões de compra inteligentes.
        </p>
        <p>
          Todas as compras são finalizadas diretamente no ambiente oficial do Mercado Livre, garantindo proteção ao
          comprador, entrega rastreada e formas de pagamento seguras. O Tech Oferta não realiza intermediação de
          pagamentos nem cobra taxas extras: os preços exibidos refletem as ofertas divulgadas através dos nossos links
          de afiliado.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/70 space-y-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h2 className="font-semibold text-zinc-100">Curadoria Dedicada</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ofertas selecionadas e organizadas em mais de 13 categorias de tecnologia.
          </p>
        </div>
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/70 space-y-2">
          <Shield className="w-5 h-5 text-yellow-400" />
          <h2 className="font-semibold text-zinc-100">Compra Oficial</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Redirecionamento direto para os anúncios oficiais dentro do Mercado Livre.
          </p>
        </div>
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/70 space-y-2">
          <Mail className="w-5 h-5 text-yellow-400" />
          <h2 className="font-semibold text-zinc-100">Transparência</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Sem preços ou descontos inventados: exibimos apenas reduções confirmadas.
          </p>
        </div>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={() => onNavigate('/ofertas')}
          className="px-6 py-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-sm"
        >
          Explorar Ofertas Agora
        </button>
      </div>
    </div>
  );
}

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar mensagem.');
      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-2 border-b border-zinc-800 pb-6">
        <span className="text-xs font-semibold text-yellow-400">Fale Conosco</span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-zinc-50">Contato</h1>
        <p className="text-sm sm:text-base text-zinc-400">
          Dúvidas sobre ofertas, sugestões de categorias ou parcerias? Envie sua mensagem abaixo.
        </p>
      </div>

      {sent ? (
        <div className="p-6 rounded-xl border border-emerald-500/40 bg-emerald-950/20 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-semibold text-zinc-100">Mensagem enviada com sucesso!</h2>
            <p className="text-sm text-zinc-300">
              Recebemos seu contato no painel do Tech Oferta e responderemos o mais breve possível.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-2 text-xs font-semibold text-yellow-400 hover:underline"
            >
              Enviar outra mensagem
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border border-zinc-800 bg-zinc-900/70">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/40 text-xs text-red-200">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Nome completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Assunto</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Mensagem</label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-yellow-400"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-sm disabled:opacity-60"
          >
            {submitting ? 'Enviando...' : 'Enviar Mensagem'}
          </button>
        </form>
      )}
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div className="space-y-2 border-b border-zinc-800 pb-6">
        <span className="text-xs font-semibold text-yellow-400">Documentação Legal</span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-zinc-50">Política de Privacidade</h1>
      </div>
      <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
        <p>
          O <strong className="text-zinc-100">Tech Oferta</strong> respeita a privacidade de todos os visitantes e
          adota práticas alinhadas à Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>
        <h2 className="font-display text-xl font-bold text-zinc-100 pt-2">1. Dados coletados</h2>
        <p>
          Não exigimos cadastro ou login para navegar pelas ofertas do catálogo. Caso você utilize o formulário de
          contato, armazenamos apenas nome, e-mail e mensagem informados voluntariamente para responder à sua
          solicitação.
        </p>
        <h2 className="font-display text-xl font-bold text-zinc-100 pt-2">2. Links de afiliados e terceiros</h2>
        <p>
          Ao clicar nos botões de compra (&ldquo;CONFERIR OFERTA&rdquo; ou &ldquo;COMPRAR NO MERCADO LIVRE&rdquo;), você é
          direcionado ao site oficial do Mercado Livre por meio de links de afiliado. A partir desse momento, aplicam-se
          a Política de Privacidade e os cookies da respectiva plataforma parceira.
        </p>
        <h2 className="font-display text-xl font-bold text-zinc-100 pt-2">3. Transparência de comissões</h2>
        <p>
          O Tech Oferta participa de programas de afiliados e pode receber comissões por compras qualificadas efetuadas
          através dos links divulgados, sem qualquer custo adicional ao consumidor.
        </p>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div className="space-y-2 border-b border-zinc-800 pb-6">
        <span className="text-xs font-semibold text-yellow-400">Documentação Legal</span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-zinc-50">Termos de Uso</h1>
      </div>
      <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
        <p>
          Ao acessar e utilizar o portal <strong className="text-zinc-100">Tech Oferta</strong>, você concorda com os
          termos descritos abaixo.
        </p>
        <h2 className="font-display text-xl font-bold text-zinc-100 pt-2">1. Natureza do serviço</h2>
        <p>
          O Tech Oferta atua exclusivamente como portal de divulgação e curadoria de produtos e ofertas de tecnologia no
          Mercado Livre. Não realizamos vendas diretas, não processamos pagamentos, não emitimos notas fiscais e não
          realizamos entregas.
        </p>
        <h2 className="font-display text-xl font-bold text-zinc-100 pt-2">2. Preços e disponibilidade</h2>
        <p>
          Os valores, descontos, estoques e prazos de entrega exibidos no site são baseados nas informações disponíveis
          no momento da publicação ou atualização da oferta e podem sofrer alterações a qualquer instante diretamente no
          Mercado Livre. Em caso de divergência, prevalece sempre o preço exibido na página final do Mercado Livre.
        </p>
        <h2 className="font-display text-xl font-bold text-zinc-100 pt-2">3. Garantia e atendimento pós-venda</h2>
        <p>
          Trocas, devoluções, garantias e suporte referente aos produtos adquiridos devem ser tratados diretamente com o
          vendedor e pela plataforma do Mercado Livre.
        </p>
      </div>
    </div>
  );
}
