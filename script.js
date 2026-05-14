// ── CONFIG ──
// Após o deploy no Vercel, substitua pela URL real:
// Ex: https://barber-project.vercel.app
const API_BASE = '/api';

let horarioSelecionado = null;

// Todos os slots possíveis (seg-sex 07-20, sab 08-18, dom 09-14)
function getSlotsParaDia(dataStr) {
    const d = new Date(dataStr + 'T12:00:00');
    const dow = d.getDay(); // 0=dom, 6=sab
    if (dow === 0) return ['09:00','10:00','11:00','12:00','13:00'];
    if (dow === 6) return ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
    return ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
}

async function carregarHorarios(data) {
    horarioSelecionado = null;
    const container = document.getElementById('slots-container');
    container.innerHTML = '<div class="slots-loading">Carregando horários...</div>';

    // Bloqueia datas passadas
    const hoje = new Date().toISOString().split('T')[0];
    if (data < hoje) {
        container.innerHTML = '<div class="slots-loading" style="color:#ef9a9a">Selecione uma data futura.</div>';
        return;
    }

    let ocupados = [];
    try {
        const res = await fetch(`${API_BASE}/agendamentos?data=${data}`);
        const json = await res.json();
        ocupados = json.ocupados || [];
    } catch (e) {
        // Se a API não estiver disponível ainda, continua sem ocupados
        console.warn('API não disponível, mostrando todos os slots livres.');
    }

    const slots = getSlotsParaDia(data);
    const grid = document.createElement('div');
    grid.className = 'horarios-grid';

    slots.forEach(h => {
        const btn = document.createElement('div');
        btn.className = 'slot' + (ocupados.includes(h) ? ' ocupado' : '');
        btn.textContent = h;
        if (!ocupados.includes(h)) {
            btn.onclick = () => selecionarSlot(btn, h);
        }
        grid.appendChild(btn);
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

function selecionarSlot(el, horario) {
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('selecionado'));
    el.classList.add('selecionado');
    horarioSelecionado = horario;
}

async function enviarAgendamento() {
    const nome     = document.getElementById('f-nome').value.trim();
    const telefone = document.getElementById('f-tel').value.trim();
    const servico  = document.getElementById('f-servico').value;
    const data     = document.getElementById('f-data').value;
    const obs      = document.getElementById('f-obs').value.trim();
    const feedback = document.getElementById('form-feedback');
    const btn      = document.getElementById('btn-submit');

    // Validação
    if (!nome || !telefone || !servico || !data || !horarioSelecionado) {
        mostrarFeedback('error', '⚠️ Preencha todos os campos e selecione um horário.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const res = await fetch(`${API_BASE}/agendamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, telefone, servico, data, horario: horarioSelecionado, observacoes: obs })
        });

        const json = await res.json();

        if (!res.ok) {
            mostrarFeedback('error', '❌ ' + (json.erro || 'Erro ao agendar. Tente novamente.'));
            btn.disabled = false;
            btn.textContent = 'Confirmar Agendamento';
            return;
        }

        mostrarFeedback('success', '✅ Agendamento confirmado! Até lá 🤙');

        // Abre WhatsApp do barbeiro com os detalhes
        if (json.whatsappLink) {
            setTimeout(() => window.open(json.whatsappLink, '_blank'), 1200);
        }

        // Recarrega slots para refletir o novo agendamento
        carregarHorarios(data);
        btn.textContent = 'Confirmar Agendamento';

    } catch (e) {
        mostrarFeedback('error', '❌ Erro de conexão. Tente novamente.');
        btn.disabled = false;
        btn.textContent = 'Confirmar Agendamento';
    }
}

function mostrarFeedback(tipo, msg) {
    const el = document.getElementById('form-feedback');
    el.className = 'form-feedback ' + tipo;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 6000);
}

// Define data mínima como hoje
document.getElementById('f-data').min = new Date().toISOString().split('T')[0];

// Reveal on scroll
const obs = new IntersectionObserver(entries => {
    entries.forEach((e,i) => {
        if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 80);
    });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// Nav scroll
window.addEventListener('scroll', () => {
    document.querySelector('nav').style.padding = window.scrollY > 60 ? '.8rem 4rem' : '1.2rem 4rem';
});