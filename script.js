// ====== DADOS INICIAIS ======
function gerarHistoricoInicial() {
  const agora = Date.now();
  const pontos = 60; // last 60 minutes
  const intervaloMs = 60 * 1000; // 1 minute

  historicoPrecos = {};

  for (let ativo in ativosB3) {
    let precoBase = ativosB3[ativo];
    historicoPrecos[ativo] = [];

    // create points from oldest -> newest, aligned to minute start
    for (let i = pontos; i > 0; i--) {
      const t = Math.floor((agora - i * intervaloMs) / intervaloMs) * intervaloMs;

      precoBase += (Math.random() - 0.5) * 0.2;
      precoBase = parseFloat(precoBase.toFixed(2));

      let open = precoBase + (Math.random() - 0.5) * 0.2;
      let high = open + Math.random() * 0.3;
      let low = open - Math.random() * 0.3;
      let close = low + Math.random() * (high - low);

      historicoPrecos[ativo].push({
        t: t,
        o: parseFloat(open.toFixed(2)),
        h: parseFloat(high.toFixed(2)),
        l: parseFloat(low.toFixed(2)),
        c: parseFloat(close.toFixed(2))
      });
    }
  }
}

function updateMinuteCandle(ativo, novoPreco) {
  const agora = Date.now();
  const minuteStart = Math.floor(agora / 60000) * 60000; // start of current minute

  if (!historicoPrecos[ativo]) historicoPrecos[ativo] = [];
  const hist = historicoPrecos[ativo];
  const last = hist[hist.length - 1];

  if (!last || last.t < minuteStart) {
    // Start new candle — open = price at first tick of the minute
    hist.push({
      t: minuteStart,
      o: parseFloat(novoPreco.toFixed(2)), // fix: use current tick, not last.c
      h: parseFloat(novoPreco.toFixed(2)),
      l: parseFloat(novoPreco.toFixed(2)),
      c: parseFloat(novoPreco.toFixed(2))
    });
  } else {
    // Update current candle's high/low/close with every tick
    last.h = parseFloat(Math.max(last.h, novoPreco).toFixed(2));
    last.l = parseFloat(Math.min(last.l, novoPreco).toFixed(2));
    last.c = parseFloat(novoPreco.toFixed(2));
  }

  // keep last 60 minutes
  const cutoff = minuteStart - 60 * 60 * 1000;
  historicoPrecos[ativo] = hist.filter(d => d.t >= cutoff);
}

const ativosB3 = {
  PETR4: 28.50, VALE3: 72.30, ITUB4: 31.10, BBDC4: 27.80,
  ABEV3: 14.25, MGLU3: 3.45, BBAS3: 49.10, LREN3: 18.30
};

let usuarioAtual = null;
let extrato = [];
let ordens = [];
let cpfAtual = "";
let historicoPrecos = {};

gerarHistoricoInicial();

// ====== USUÁRIOS PADRÃO ======
function inicializarUsuariosPadrao() {
  const padrao = {
    "11111111111": { senha: "123", nome: "Conta A", saldo: 100000, carteira: { PETR4: 300, VALE3: 200, ITUB4: 100 } },
    "22222222222": { senha: "456", nome: "Conta B", saldo: 10, carteira: { MGLU3: 100, BBAS3: 100 } }
  };
  if (!localStorage.getItem("usuarios")) {
    localStorage.setItem("usuarios", JSON.stringify(padrao));
  }
}
inicializarUsuariosPadrao();

// ====== LOGIN / LOGOUT ======
function login() {
  const cpf = document.getElementById("cpf").value.replace(/\D/g, '');
  const senha = document.getElementById("senha").value;
  const usuarios = JSON.parse(localStorage.getItem("usuarios") || "{}");
  const user = usuarios[cpf];
  if (user && user.senha === senha) {
    usuarioAtual = JSON.parse(JSON.stringify(user));
    cpfAtual = cpf;
    extrato = [];
    ordens = [];
    document.getElementById("username").innerText = usuarioAtual.nome;
    document.getElementById("saldo").innerText = usuarioAtual.saldo.toFixed(2);
    document.getElementById("login").classList.add("hidden");
    document.getElementById("cadastro").classList.add("hidden");
    document.getElementById("portal").classList.remove("hidden");
    atualizarCarteira();
    atualizarBook();
    preencherSelectAtivos();
    atualizarExtrato();
    atualizarOrdens();
    document.getElementById("senhaMsg").innerText = "";
    inicializarGrafico();
    atualizarGraficoAtivo();
  } else {
    document.getElementById("loginMsg").innerText = "CPF ou senha inválidos.";
  }
}

function logout() {
  usuarioAtual = null;
  extrato = [];
  ordens = [];
  cpfAtual = "";
  document.getElementById("portal").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
  document.getElementById("cadastro").classList.add("hidden");
  document.getElementById("cpf").value = "";
  document.getElementById("senha").value = "";
}

// ====== FUNÇÕES DE USUÁRIO ======
function toggleSenha(idCampo, elemento) {
  const campo = document.getElementById(idCampo);
  campo.type = campo.type === "password" ? "text" : "password";
  elemento.innerText = campo.type === "password" ? "👁️" : "🙈";
}

function alterarSenha() {
  const novaSenha = document.getElementById("novaSenha").value;
  if (!novaSenha || novaSenha.length < 3) {
    document.getElementById("senhaMsg").innerText = "Senha inválida. Mínimo 3 caracteres.";
    document.getElementById("senhaMsg").className = "error";
    return;
  }
  const usuarios = JSON.parse(localStorage.getItem("usuarios") || "{}");
  usuarios[cpfAtual].senha = novaSenha;
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
  document.getElementById("senhaMsg").innerText = "Senha alterada com sucesso!";
  document.getElementById("senhaMsg").className = "success";
  document.getElementById("novaSenha").value = "";
}

// ====== ATUALIZAÇÃO DE TABELAS ======
function atualizarCarteira() {
  const tbody = document.querySelector("#carteira tbody");
  tbody.innerHTML = "";
  for (let ativo in usuarioAtual.carteira) {
    tbody.innerHTML += `<tr><td>${ativo}</td><td>${usuarioAtual.carteira[ativo]}</td></tr>`;
  }
  document.getElementById("saldo").innerText = usuarioAtual.saldo.toFixed(2);
}

function atualizarBook() {
  const tbody = document.querySelector("#book tbody");
  tbody.innerHTML = "";
  for (let ativo in ativosB3) {
    tbody.innerHTML += `<tr><td>${ativo}</td><td>${ativosB3[ativo].toFixed(2)}</td></tr>`;
  }
}

function preencherSelectAtivos() {
  const select = document.getElementById("ativo");
  select.innerHTML = "";
  for (let ativo in ativosB3) {
    select.innerHTML += `<option value="${ativo}">${ativo}</option>`;
  }
}

// ====== OPERAÇÕES ======
function executarOperacao() {
  const tipo = document.getElementById("tipo").value;
  const ativo = document.getElementById("ativo").value;
  const qtd = parseInt(document.getElementById("quantidade").value);
  const valor = parseFloat(document.getElementById("valor").value);
  const cotacao = ativosB3[ativo];
  const total = qtd * valor;

  const mensagem = document.getElementById("mensagemOperacao");
  if (isNaN(qtd) || qtd <= 0 || qtd % 100 !== 0 || isNaN(valor)) {
    mensagem.innerText = "Preencha quantidade válida (múltiplos de 100) e valor.";
    return;
  }
  if (tipo === "Compra" && total > usuarioAtual.saldo) {
    mensagem.innerText = "Saldo insuficiente para essa compra.";
    return;
  }
  if (tipo === "Venda" && (!usuarioAtual.carteira[ativo] || usuarioAtual.carteira[ativo] < qtd)) {
    mensagem.innerText = "Você não possui ativos suficientes para vender.";
    return;
  }
  if (Math.abs(valor - cotacao) > 5) {
    ordens.unshift({ tipo, ativo, qtd, valor, total, cotacao, status: "Rejeitada", id: Date.now() });
    atualizarOrdens();
    mensagem.innerText = "Ordem rejeitada (diferença > R$5).";
    return;
  }

  const ordem = {
    tipo, ativo, qtd, valor, total, cotacao,
    status: valor === cotacao ? "Executada" : "Aceita",
    id: Date.now()
  };

  if (ordem.status === "Executada") {
    aplicarOrdem(ordem);
    extrato.unshift(ordem);
  }

  ordens.unshift(ordem);
  atualizarOrdens();
  atualizarCarteira();
  atualizarExtrato();
  mensagem.innerText = "Ordem enviada.";
}

function aplicarOrdem(o) {
  if (o.tipo === "Compra") {
    usuarioAtual.saldo -= o.total;
    usuarioAtual.carteira[o.ativo] = (usuarioAtual.carteira[o.ativo] || 0) + o.qtd;
  } else {
    usuarioAtual.saldo += o.total;
    usuarioAtual.carteira[o.ativo] -= o.qtd;
  }
}

function cancelarOrdem(id) {
  const index = ordens.findIndex(o => o.id === id && o.status === "Aceita");
  if (index !== -1) {
    ordens.splice(index, 1);
    atualizarOrdens();
    document.getElementById("mensagemOperacao").innerText = "Ordem cancelada.";
  }
}

function atualizarOrdens() {
  const tbody = document.querySelector("#ordens tbody");
  tbody.innerHTML = "";
  ordens.forEach(o => {
    tbody.innerHTML += `
      <tr>
        <td>${o.tipo}</td>
        <td>${o.ativo}</td>
        <td>${o.qtd}</td>
        <td>${o.valor.toFixed(2)}</td>
        <td>${o.cotacao.toFixed(2)}</td>
        <td>${o.status}</td>
        <td>${o.status === "Aceita" ? `<button class="btn-cancelar" onclick="cancelarOrdem(${o.id})">Cancelar</button>` : ""}</td>
      </tr>`;
  });
}

function atualizarExtrato() {
  const tbody = document.querySelector("#extrato tbody");
  tbody.innerHTML = "";
  extrato.forEach(e => {
    tbody.innerHTML += `<tr><td>${e.tipo}</td><td>${e.ativo}</td><td>${e.qtd}</td><td>${e.total.toFixed(2)}</td></tr>`;
  });
}

// ====== CADASTRO ======
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf[i - 1]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto >= 10) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf[i - 1]) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto >= 10) resto = 0;
  return resto === parseInt(cpf[10]);
}

const form = document.getElementById("cadastroForm");
if (form) {
  const nome = document.getElementById("nome");
  const cpf = document.getElementById("cpfCadastro");
  const email = document.getElementById("email");
  const celular = document.getElementById("celular");
  const senha = document.getElementById("senhaCadastro");
  const confirmarSenha = document.getElementById("confirmarSenha");
  const criarContaBtn = document.getElementById("criarContaBtn");
  const mensagem = document.getElementById("mensagem");

  function validarFormulario() {
    const nomeValido = nome.value.length >= 6;
    const cpfValido = validarCPF(cpf.value);
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
    const celularValido = /^\d{10,11}$/.test(celular.value);
    const senhaValida = senha.value.length >= 6;
    const senhasIguais = senha.value === confirmarSenha.value;

    document.getElementById("nomeError").textContent = nomeValido ? "" : "Nome muito curto.";
    document.getElementById("cpfError").textContent = cpfValido ? "" : "CPF inválido.";
    document.getElementById("emailError").textContent = emailValido ? "" : "E-mail inválido.";
    document.getElementById("celularError").textContent = celularValido ? "" : "Celular inválido.";
    document.getElementById("senhaError").textContent = senhaValida ? "" : "Senha fraca.";
    document.getElementById("confirmarSenhaError").textContent = senhasIguais ? "" : "Senhas diferentes.";

    criarContaBtn.disabled = !(nomeValido && cpfValido && emailValido && celularValido && senhaValida && senhasIguais);
  }

  form.addEventListener("input", validarFormulario);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const usuarios = JSON.parse(localStorage.getItem("usuarios") || "{}");
    const novoCpf = cpf.value.replace(/\D/g, '');
    if (usuarios[novoCpf]) {
      mensagem.textContent = "CPF já cadastrado.";
      mensagem.style.color = "red";
      return;
    }

    usuarios[novoCpf] = {
      nome: nome.value,
      senha: senha.value,
      saldo: 10000,
      carteira: {}
    };

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    mensagem.textContent = "Cadastro realizado com sucesso!";
    mensagem.style.color = "green";
    setTimeout(() => {
      mostrarLogin();
    }, 1500);
  });
}

function mostrarCadastro() {
  document.getElementById("login").classList.add("hidden");
  document.getElementById("cadastro").classList.remove("hidden");
}

function mostrarLogin() {
  document.getElementById("cadastro").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
}

// ====== EXPORTAÇÃO ======
function baixarJSON() {
  if (extrato.length === 0) {
    alert("Não há operações para exportar.");
    return;
  }
  const blob = new Blob([JSON.stringify(extrato, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "extrato_operacoes.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function baixarCSV() {
  if (extrato.length === 0) {
    alert("Não há operações para exportar.");
    return;
  }
  const header = ["Tipo", "Ativo", "Quantidade", "Valor Total (R$)"];
  const linhas = extrato.map(e => [
    e.tipo,
    e.ativo,
    e.qtd,
    e.total.toFixed(2).replace(".", ",")
  ]);
  
  let csvContent = header.join(";") + "\n" + linhas.map(l => l.join(";")).join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "extrato_operacoes.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ====== GRÁFICO (CANDLESTICK) ======
window.grafico = null;

function inicializarGrafico() {
  const ctx = document.getElementById("graficoPrecos").getContext("2d");

  window.grafico = new Chart(ctx, {
    type: 'candlestick',
    data: {
      datasets: [{
        label: '',
        data: []
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'minute' },
          adapters: { date: { locale: 'pt-BR' } }
        },
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

function atualizarGrafico(ativo, intervaloMinutos) {
  const agora = Date.now();
  const duracaoMs = intervaloMinutos * 60 * 1000;

  // show last 60 minutes of data (aggregated into the chosen interval)
  const limite = agora - 60 * 60 * 1000;

  // source = 1-minute candles
  const src = (historicoPrecos[ativo] || []).filter(p => p.t >= limite).sort((a,b) => a.t - b.t);

  // aggregate into buckets of duracaoMs
  const aggregated = [];
  src.forEach(c => {
    const bucketStart = Math.floor(c.t / duracaoMs) * duracaoMs;
    const last = aggregated[aggregated.length - 1];
    if (!last || last.t !== bucketStart) {
      aggregated.push({ t: bucketStart, o: c.o, h: c.h, l: c.l, c: c.c });
    } else {
      last.h = Math.max(last.h, c.h);
      last.l = Math.min(last.l, c.l);
      last.c = c.c; // last close wins
    }
  });

  const dados = aggregated.map(p => ({ x: p.t, o: p.o, h: p.h, l: p.l, c: p.c }));

  if (!window.grafico) return;

  window.grafico.data.datasets[0].label = ativo;
  window.grafico.data.datasets[0].data = dados;
  window.grafico.update();
}

function atualizarGraficoAtivo() {
  const ativoSelecionado = document.getElementById("ativoGrafico").value;
  const intervalo = parseInt(document.getElementById("intervaloGrafico").value, 10);
  atualizarGrafico(ativoSelecionado, intervalo);
}

// Atualiza gráfico imediatamente ao trocar ativo ou intervalo
document.getElementById("ativoGrafico").addEventListener("change", atualizarGraficoAtivo);
document.getElementById("intervaloGrafico").addEventListener("change", atualizarGraficoAtivo);

// === setInterval: atualizar ativos e guardar OHLC consistente (t em ms) ===
setInterval(() => {
  const agora = Date.now();

  for (let ativo in ativosB3) {
    const ultimoPreco = ativosB3[ativo];
    const novoPreco = parseFloat((ultimoPreco + (Math.random() - 0.5) * 0.2).toFixed(2));
    ativosB3[ativo] = novoPreco;

    // update the current 1-minute candle (create if we've crossed minute boundary)
    updateMinuteCandle(ativo, novoPreco);
  }

  // try execute orders whose price matches current market price
  ordens.forEach(o => {
    if (o.status === "Aceita" && o.valor === ativosB3[o.ativo]) {
      aplicarOrdem(o);
      o.status = "Executada";
      extrato.unshift(o);
    }
  });

  if (usuarioAtual) {
    atualizarBook();
    atualizarOrdens();
    atualizarCarteira();
    atualizarExtrato();
    try { atualizarGraficoAtivo(); } catch (e) { /* don't break app */ }
  }
}, 10000); // keep ticks at 10s for price simulation