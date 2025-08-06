// Dados iniciais
const ativosB3 = {
  PETR4: 28.50, VALE3: 72.30, ITUB4: 31.10, BBDC4: 27.80,
  ABEV3: 14.25, MGLU3: 3.45, BBAS3: 49.10, LREN3: 18.30
};

let usuarioAtual = null;
let extrato = [];
let ordens = [];
let cpfAtual = "";

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

// CPF validator
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

// Cadastro
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

// Atualização automática
setInterval(() => {
  for (let ativo in ativosB3) {
    ativosB3[ativo] += 0.01;
    ativosB3[ativo] = parseFloat(ativosB3[ativo].toFixed(2));
  }

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
  }
}, 10000);
