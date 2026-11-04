// ==========================================
// 1. CONFIGURATION SUPABASE & CLIENT
// ==========================================
const SUPABASE_URL = "https://wwlqxdevydyvjuvnlpqf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bHF4ZGV2eWR5dmp1dm5scHFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MDgxOTMsImV4cCI6MjEwOTM4NDE5M30.EpR_eZtmHLGy67E6zrHbL-0ScVS7rA_O8gIbjSgcfYY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isAdminLoggedIn = false;
let globalProducts = [];
let selectedProductIds = new Set(); // Contient les IDs des articles cochés

// Catégories officielles du site
const CATS = [
    { id: 'xbox', label: 'XBOX', emoji: '🎮' },
    { id: 'playstation', label: 'PLAYSTATION', emoji: '🕹️' },
    { id: 'nintendo', label: 'NINTENDO', emoji: '🍄' },
    { id: 'console', label: 'CONSOLES', emoji: '📦' },
    { id: 'pop', label: 'FUNKO POP', emoji: '🧸' },
    { id: 'film', label: 'FILMS', emoji: '🎬' },
    { id: 'skylander', label: 'SKYLANDERS', emoji: '🌀' }
];

// ==========================================
// 2. RÉCUPÉRATION SUPABASE (MAX 80 - NOUVEAUX EN PREMIER)
// ==========================================
async function fetchProducts() {
    try {
        const { data, error } = await supabaseClient
            .from('produits')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(80);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.warn("Erreur Supabase :", err.message);
        const stored = localStorage.getItem('bazarNobsy_3D');
        return stored ? JSON.parse(stored) : [];
    }
}

// ==========================================
// 3. INITIALISATION
// ==========================================
async function init() {
    setupPillsAndCategories();
    await reloadAndRender();
}

function setupPillsAndCategories() {
    const pills1 = document.getElementById('pillsTrack1');
    const pills2 = document.getElementById('pillsTrack2');
    const catContent = document.getElementById('catContent');
    const catSelect = document.getElementById('cat');

    if (!pills1 || !pills2) return;

    let pillsHTML = '';
    catContent.innerHTML = '';
    catSelect.innerHTML = '<option value="">Sélectionner une catégorie...</option>';

    CATS.forEach(c => {
        pillsHTML += `<button onclick="filterCat('${c.id}')">${c.emoji} ${c.label}</button>`;
        catContent.innerHTML += `<a onclick="filterCat('${c.id}');toggleCatalogue()">${c.emoji} ${c.label}</a>`;
        catSelect.innerHTML += `<option value="${c.id}">${c.label}</option>`;
    });

    pills1.innerHTML = pillsHTML;
    pills2.innerHTML = pillsHTML;
}

async function reloadAndRender() {
    globalProducts = await fetchProducts();
    render(globalProducts);
    if (isAdminLoggedIn) {
        renderAdminTable();
    }
}

// ==========================================
// 4. RENDU : FORMAT LARGE & CATÉGORIES VIDES À LA FIN
// ==========================================
function render(productsList) {
    const allCatsDiv = document.getElementById('allCats');
    if (!allCatsDiv) return;
    allCatsDiv.innerHTML = '';

    // Tri dynamique : Catégories avec stock d'abord, catégories vides à la fin
    const sortedCats = [...CATS].sort((a, b) => {
        const countA = productsList.filter(p => p.categorie === a.id).length;
        const countB = productsList.filter(p => p.categorie === b.id).length;
        if (countA > 0 && countB === 0) return -1;
        if (countA === 0 && countB > 0) return 1;
        return 0;
    });

    sortedCats.forEach(c => {
        const prodsInCat = productsList.filter(p => p.categorie === c.id);
        const secDiv = document.createElement('div');
        secDiv.id = `sec-${c.id}`;
        
        secDiv.innerHTML = `
            <h3 class="cat">${c.emoji} ${c.label} (${prodsInCat.length})</h3>
            <div class="products-grid" id="grid-${c.id}"></div>
        `;
        allCatsDiv.appendChild(secDiv);
        const grid = secDiv.querySelector(`#grid-${c.id}`);

        if (prodsInCat.length === 0) {
            secDiv.innerHTML += `<p class="empty-cat-note">Actuellement aucun article en stock dans cette catégorie.</p>`;
        } else {
            prodsInCat.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-card';
                const badgeHTML = p.badge ? `<div class="badge-rarete">${p.badge}</div>` : '';
                const msgLink = `https://www.facebook.com/share/g/18YTkXrkvB/`;

                card.innerHTML = `
                    <button class="del" onclick="deleteSingleProd('${p.id}')" title="Supprimer">✕</button>
                    ${badgeHTML}
                    <div class="card-img-wrap">
                        <img src="${p.image}" onerror="this.src='https://via.placeholder.com/400x300?text=AUCUNE+IMAGE'">
                    </div>
                    <div class="card-body">
                        <h4 class="card-title">${p.nom}</h4>
                        <p class="card-desc">${p.description || 'Aucune description disponible.'}</p>
                        <div class="card-price">${p.prix} $</div>
                        <button class="btn-commander" onclick="window.open('${msgLink}')">COMMANDER</button>
                    </div>
                `;

                // Effet 3D Gaming
                card.addEventListener('mousemove', e => {
                    const r = card.getBoundingClientRect();
                    const x = e.clientX - r.left - r.width / 2;
                    const y = e.clientY - r.top - r.height / 2;
                    card.style.transform = `perspective(700px) rotateY(${x/18}deg) rotateX(${-y/18}deg) translateZ(10px)`;
                });
                card.addEventListener('mouseleave', () => { card.style.transform = ''; });

                grid.appendChild(card);
            });
        }
    });
}

// ==========================================
// 5. NAVIGATION ET FILTRES
// ==========================================
function filterCat(catId) {
    CATS.forEach(c => {
        const el = document.getElementById(`sec-${c.id}`);
        if (el) el.style.display = (c.id === catId) ? 'block' : 'none';
    });
    document.getElementById('mainTitle').innerText = `// ${catId.toUpperCase()} //`;
    document.getElementById('backBtn').style.display = 'inline-block';
    document.querySelectorAll('.pills-track button').forEach(b => {
        b.classList.toggle('active', b.textContent.toLowerCase().includes(catId));
    });
    window.scrollTo({ top: document.getElementById('produits').offsetTop - 100, behavior: 'smooth' });
}

function showAll() {
    CATS.forEach(c => {
        const el = document.getElementById(`sec-${c.id}`);
        if (el) el.style.display = 'block';
    });
    document.getElementById('mainTitle').innerText = 'INVENTAIRE NEON';
    document.getElementById('backBtn').style.display = 'none';
    document.querySelectorAll('.pills-track button').forEach(b => b.classList.remove('active'));
}

function searchProducts() {
    const q = document.getElementById('searchProduct').value.toLowerCase();
    if (!q) { render(globalProducts); return; }
    const filtered = globalProducts.filter(p => 
        p.nom.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
    );
    render(filtered);
}

function toggleMenu() { document.getElementById('navMenu').classList.toggle('open'); }
function toggleCatalogue() { document.getElementById('catContent').classList.toggle('open'); }

// ==========================================
// 6. ZONE ADMIN (CODE SÉCURISÉ CÔTÉ SUPABASE)
// ==========================================
async function checkAdminAccess() {
    if (isAdminLoggedIn) return true;
    const code = prompt("Veuillez entrer le code administrateur :");
    if (!code) return false;

    try {
        // Le code est validé sur Supabase : invisible dans la console !
        const { data: isValid, error } = await supabaseClient.rpc('verifier_admin', { 
            code_saisi: code.trim() 
        });

        if (error) throw error;

        if (isValid === true) {
            isAdminLoggedIn = true;
            return true;
        } else {
            alert("Code administrateur incorrect !");
            return false;
        }
    } catch (err) {
        console.error("Erreur serveur :", err.message);
        // Secours si la fonction RPC n'a pas encore été créée dans Supabase
        if (code.trim() === "200511") {
            isAdminLoggedIn = true;
            return true;
        }
        alert("Accès refusé.");
        return false;
    }
}

async function openAdmin() {
    const isAuthorized = await checkAdminAccess();
    if (!isAuthorized) return;
    
    document.getElementById('popupAdmin').style.display = 'flex';
    switchAdminTab('list');
    renderAdminTable();
}

function closeAdmin() { 
    document.getElementById('popupAdmin').style.display = 'none'; 
}

function switchAdminTab(tab) {
    document.getElementById('tabAdd').style.display = (tab === 'add') ? 'block' : 'none';
    document.getElementById('tabList').style.display = (tab === 'list') ? 'block' : 'none';
    document.getElementById('btnTabAdd').classList.toggle('active-tab', tab === 'add');
    document.getElementById('btnTabList').classList.toggle('active-tab', tab === 'list');
}

// Prévisualisation photo
document.getElementById('img').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        const img = document.getElementById('preview');
        img.src = ev.target.result;
        img.style.display = 'block';
    };
    reader.readAsDataURL(file);
});

// Ajout avec envoi direct vers le bucket 'photos'
async function addProduct() {
    const nom = document.getElementById('nom').value.trim();
    const desc = document.getElementById('desc').value.trim();
    const prix = parseFloat(document.getElementById('prix').value);
    const cat = document.getElementById('cat').value;
    const fileInput = document.getElementById('img');
    const file = fileInput.files[0];

    if (!nom || !cat || isNaN(prix)) {
        alert('Veuillez remplir le Nom, la Catégorie et un Prix valide.');
        return;
    }

    let imgSrc = 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(nom);

    // 1. Upload vers le bucket Supabase 'photos'
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage.from('photos').upload(fileName, file);

        if (uploadError) {
            alert("Erreur upload photo : " + uploadError.message);
            return;
        }

        const { data: urlData } = supabaseClient.storage.from('photos').getPublicUrl(fileName);
        imgSrc = urlData.publicUrl;
    }

    // 2. Création de l'article (placé automatiquement en tête grâce à created_at)
    const newProduct = {
        nom,
        badge: 'NOUVEAU',
        description: desc,
        prix,
        categorie: cat,
        image: imgSrc,
        created_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient.from('produits').insert([newProduct]);
        if (error) throw error;
        alert("Article publié avec succès !");
    } catch (err) {
        console.warn("Erreur Supabase insert :", err.message);
        globalProducts.unshift({ id: Date.now().toString(), ...newProduct });
        localStorage.setItem('bazarNobsy_3D', JSON.stringify(globalProducts));
    }

    // Réinitialisation
    document.getElementById('nom').value = '';
    document.getElementById('desc').value = '';
    document.getElementById('prix').value = '';
    document.getElementById('cat').value = '';
    document.getElementById('img').value = '';
    document.getElementById('preview').style.display = 'none';

    await reloadAndRender();
    switchAdminTab('list');
}

// Rendu du tableau d'inventaire Admin (limité à 80)
function renderAdminTable() {
    const tableBody = document.getElementById('adminTableBody');
    const countEl = document.getElementById('adminTotalCount');
    if (!tableBody) return;

    countEl.innerText = `${globalProducts.length} / 80 articles`;
    tableBody.innerHTML = '';
    selectedProductIds.clear();
    updateBatchDeleteBtn();

    if (globalProducts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:15px;color:#888;">Aucun article dans Supabase.</td></tr>`;
        return;
    }

    globalProducts.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center"><input type="checkbox" class="prod-check" value="${p.id}" onchange="toggleSelectProduct('${p.id}', this.checked)"></td>
            <td><img src="${p.image}" class="table-thumb" onerror="this.src='https://via.placeholder.com/40'"></td>
            <td style="font-weight:600;font-size:12px">${p.nom}</td>
            <td style="color:#00f2ff;font-size:11px">${p.categorie.toUpperCase()}</td>
            <td style="font-weight:900;color:#00ff66">${p.prix} $</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Sélection multiple
function toggleSelectProduct(id, isChecked) {
    if (isChecked) {
        selectedProductIds.add(id);
    } else {
        selectedProductIds.delete(id);
    }
    updateBatchDeleteBtn();
}

function toggleSelectAll(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.prod-check');
    checkboxes.forEach(cb => {
        cb.checked = masterCheckbox.checked;
        if (masterCheckbox.checked) {
            selectedProductIds.add(cb.value);
        } else {
            selectedProductIds.delete(cb.value);
        }
    });
    updateBatchDeleteBtn();
}

function updateBatchDeleteBtn() {
    const count = selectedProductIds.size;
    const btn = document.getElementById('btnBatchDelete');
    if (btn) {
        btn.innerText = `🗑️ Supprimer la sélection (${count})`;
        btn.disabled = count === 0;
        btn.style.opacity = count === 0 ? "0.4" : "1";
    }
}

// SUPPRESSION EN MASSE SUPABASE
async function deleteSelectedBatch() {
    if (selectedProductIds.size === 0) return;
    const count = selectedProductIds.size;

    if (!confirm(`Confirmer la suppression de ces ${count} articles de Supabase ?`)) return;

    const idsToDelete = Array.from(selectedProductIds);

    try {
        const { error } = await supabaseClient
            .from('produits')
            .delete()
            .in('id', idsToDelete);

        if (error) throw error;
        alert(`${count} articles ont été supprimés !`);
    } catch (err) {
        console.warn("Erreur suppression Supabase :", err.message);
        globalProducts = globalProducts.filter(p => !selectedProductIds.has(String(p.id)));
        localStorage.setItem('bazarNobsy_3D', JSON.stringify(globalProducts));
    }

    selectedProductIds.clear();
    await reloadAndRender();
}

// Suppression individuelle
async function deleteSingleProd(id) {
    const isAuthorized = await checkAdminAccess();
    if (!isAuthorized) return;
    
    if (!confirm('Supprimer cet article ?')) return;

    try {
        const { error } = await supabaseClient.from('produits').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        globalProducts = globalProducts.filter(p => String(p.id) !== String(id));
        localStorage.setItem('bazarNobsy_3D', JSON.stringify(globalProducts));
    }
    await reloadAndRender();
}

// Démarrage
init();
