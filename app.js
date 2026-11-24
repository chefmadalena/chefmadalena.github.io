(() => {
  const dados = JSON.parse(document.getElementById("dados").textContent);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* Tradicional / mais leve */
  const seccao = $("#versoes");
  const botoes = $$(".troca button");
  const escolher = (v, foco) => {
    seccao.dataset.versao = v;
    botoes.forEach((b) => {
      const ativo = b.dataset.versao === v;
      b.setAttribute("aria-checked", String(ativo));
      b.tabIndex = ativo ? 0 : -1;
      if (ativo && foco) b.focus();
    });
    $("#versao-desc").textContent = dados.rabanadas[v].desc;
    dados.rabanadas[v].medidas.forEach((m, i) => {
      const el = $$(".medida")[i];
      $("dd", el).textContent = m.texto;
      $("i", el).style.width = `${m.pct}%`;
    });
  };
  botoes.forEach((b) => {
    b.addEventListener("click", () => escolher(b.dataset.versao));
    b.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      e.preventDefault();
      escolher(b.dataset.versao === "t" ? "l" : "t", true);
    });
  });
  escolher("t");

  /* Filtro por capítulo */
  const chips = $$(".chips button");
  const azulejos = $$(".azulejo");
  chips.forEach((c) => c.addEventListener("click", () => {
    chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    azulejos.forEach((a) => {
      a.dataset.apagado = String(Boolean(c.dataset.cap) && a.dataset.cap !== c.dataset.cap);
    });
  }));

  /* Ficha do prato */
  const dialogo = $("#prato");
  const abrir = (n) => {
    const r = dados.receitas[n];
    const img = $("#prato-img");
    img.src = `assets/pratos/${String(n).padStart(2, "0")}.webp`;
    img.alt = r.nome;
    $("#prato-cap").textContent = r.capitulo;
    $("#prato-nome").textContent = r.nome;
    $("#prato-meta").textContent = r.meta;
    $("#prato-leve").textContent = r.leve;
    $("#prato-muda").textContent = r.muda;
    $("#prato-kcal").textContent = `Por ${r.unidade}: cerca de ${r.kcalT} kcal na tradicional e ${r.kcalL} kcal na mais leve (estimativa).`;
    dialogo.showModal();
  };
  azulejos.forEach((a) => a.addEventListener("click", () => abrir(a.dataset.n)));
  $("#prato-fechar").addEventListener("click", () => dialogo.close());
  dialogo.addEventListener("click", (e) => { if (e.target === dialogo) dialogo.close(); });

  /* Barra de compra no telemóvel: aparece depois do topo e sai junto ao pedido */
  const barra = $("#barra");
  const visivel = { hero: true, pedido: false };
  const atualizar = () => { barra.hidden = visivel.hero || visivel.pedido; };
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.target.classList.contains("hero-compra")) visivel.hero = e.isIntersecting;
      else visivel.pedido = e.isIntersecting;
    });
    atualizar();
  });
  obs.observe($(".hero-compra"));
  obs.observe($("#pedido"));

  /* Compra: pede a entrega imediata e, em pré-visualização, não sai da página */
  const comprar = $("#comprar");
  const consentimento = $("#consentimento");
  const aviso = $("#aviso-checkout");
  const mostrar = (texto) => { aviso.textContent = texto; aviso.hidden = false; };
  consentimento.addEventListener("change", () => {
    if (consentimento.checked) { aviso.hidden = true; registar("caixa_marcada"); }
  });
  comprar.addEventListener("click", (e) => {
    if (!consentimento.checked) {
      e.preventDefault();
      registar("comprar_sem_caixa");
      mostrar("Marca a caixa da entrega imediata para continuar.");
      consentimento.focus();
    } else if (comprar.dataset.publicado !== "sim") {
      e.preventDefault();
      mostrar("Esta página é uma pré-visualização. O livro ainda não está à venda.");
    } else {
      registar("ir_para_checkout", "InitiateCheckout");
    }
  });

  /* Medição: Clarity e Pixel só carregam depois de o visitante aceitar */
  function registar(evento, metaEvento) {
    try { if (window.clarity) window.clarity("event", evento); } catch (err) { /* sem medição */ }
    try {
      if (window.fbq && metaEvento) {
        window.fbq("track", metaEvento, { content_name: "O Natal da Madalena", value: medicao.valor, currency: medicao.moeda });
      }
    } catch (err) { /* sem medição */ }
  }
  const medicao = dados.medicao || {};
  const CHAVE = "madalena_consent_v1";
  let aMedir = false;
  const lerEscolha = () => { try { return localStorage.getItem(CHAVE); } catch (err) { return null; } };
  const guardarEscolha = (v) => { try { localStorage.setItem(CHAVE, v); } catch (err) { /* sem armazenamento */ } };
  function comecarMedicao() {
    if (aMedir) return;
    aMedir = true;
    setTimeout(observarSeccoes, 0);
    if (medicao.clarity) {
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, "clarity", "script", medicao.clarity);
      window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
    }
    if (medicao.pixel) {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", medicao.pixel);
      window.fbq("track", "PageView");
      window.fbq("track", "ViewContent", { content_name: "O Natal da Madalena", value: medicao.valor, currency: medicao.moeda });
    }
  }
  const aviso_cookies = $("#cookie");
  const mostrarCookies = (sim) => {
    if (!aviso_cookies) return;
    aviso_cookies.hidden = !sim;
    document.body.classList.toggle("cookie-aberto", sim);
  };
  if (medicao.clarity || medicao.pixel) {
    const escolha = lerEscolha();
    if (escolha === "granted") comecarMedicao();
    else if (escolha !== "denied") mostrarCookies(true);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-consent]");
    if (b) {
      const v = b.dataset.consent;
      guardarEscolha(v);
      mostrarCookies(false);
      if (v === "granted") comecarMedicao();
      else if (aMedir) location.reload(); /* retirar o consentimento: parar o que já está a correr */
      return;
    }
    if (e.target.closest("[data-cookie-settings]")) { mostrarCookies(true); return; }
    const t = e.target.closest("[data-track]");
    if (t) registar(t.dataset.track);
  });

  /* Onde as pessoas param: cada secção conta quando o topo chega a meio do ecrã (só depois de aceitar) */
  function observarSeccoes() {
    if (!("IntersectionObserver" in window)) return;
    const vistas = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        registar("viu_" + en.target.dataset.seccao);
        vistas.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -50% 0px" });
    $$("main > section").forEach((s, i) => {
      s.dataset.seccao = s.id || s.className.split(" ")[0] || "seccao_" + i;
      vistas.observe(s);
    });
  }
  $$(".faq details").forEach((d, i) => d.addEventListener("toggle", () => { if (d.open) registar("faq_" + (i + 1)); }));
  botoes.forEach((b) => b.addEventListener("click", () => registar(b.dataset.versao === "l" ? "versao_leve" : "versao_tradicional")));
  azulejos.forEach((a) => a.addEventListener("click", () => registar("prato_aberto")));
})();
