// ==========================================
// 1. CONFIGURATION SUPABASE & ADMIN
// ==========================================
const SUPABASE_URL = "https://wwlqxdevydyvjuvnlpqf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bHF4ZGV2eWR5dmp1dm5scHFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MDgxOTMsImV4cCI6MjEwOTM4NDE5M30.EpR_eZtmHLGy67E6zrHbL-0ScVS7rA_O8gIbjSgcfYY";

// Initialisation du client Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Code Admin demandé
const ADMIN_CODE = "200511";
let isAdminLoggedIn = false;

// Catégories du Bazar
const CATS = [
    { id: 'xbox', label: 'XBOX', emoji: '🎮' },
    { id: 'playstation', label: 'PLAYSTATION', emoji: '🕹️' },
    { id: 'nintendo', label: 'NINTENDO', emoji: '🍄' },
    { id: 'console', label: 'CONSOLES', emoji: '📦' },
    { id: 'pop', label: 'FUNKO POP', emoji: '🧸' },
    { id: 'film', label: 'FILMS', emoji: '🎬' },
    { id: 'skylander', label: 'SKYLANDERS', emoji: '🌀' },
];

let globalProducts = [];

// ==========================================
// 2. RÉCUPÉRATION DES PRODUITS (NOUVEAU EN PREMIER)
// ==========================================
async function fetchProducts() {
    try {
        // Tri décroissant pour placer les nouveautés en premier
        const { data, error } = await supabaseClient
            .from('produits')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.warn("Erreur Supabase (table 'produits'): ", err.message);
        // Secours si la table distante n'est pas encore créée
        const stored = localStorage.getItem('bazarNobsy_3D');
        return stored ? JSON.parse(stored) : [];
    }
}

// ==========================================
// 3. INITIALISATION DE LA PAGE
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
}

// ==========================================
// 4. RENDU & LOGIQUE "CATÉGORIES VIDES À LA FIN"
// ==========================================
function render(productsList) {
    const allCatsDiv = document.getElementById('allCats');
    allCatsDiv.innerHTML = '';

    // RÈGLE : Calculer le nombre d'articles par catégorie pour ordonner
    // Les catégories avec produits au début, les vides TOUT À LA FIN
    const sortedCats = [...CATS].sort((a, b) => {
        const countA = productsList.filter(p => p.categorie === a.id).length;
        const countB = productsList.filter(p => p.categorie === b.id).length;
        
        if (countA > 0 && countB === 0) return -1; // a en premier
        if (countA === 0 && countB > 0) return 1;  // b en premier
        return 0;
    });

    // Création ordonnée des sections
    sortedCats.forEach(c => {
        const prodsInCat = productsList.filter(p => p.categorie === c.id);
        const secDiv = document.createElement('div');
        secDiv.id = `sec-${c.id}`;
        
        let contentHTML = `<h3 class="cat">${c.emoji} ${c.label} (${prodsInCat.length})</h3>`;
        contentHTML += `<div class="products-grid" id="grid-${c.id}"></div>`;
        secDiv.innerHTML = contentHTML;
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
                    <button class="del" onclick="deleteProd('${p.id}')" title="Supprimer">✕</button>
                    ${badgeHTML}
                    <img src="${p.image}" onerror="this.src='https://via.placeholder.com/300?text=NO+IMAGE'">
                    <h4>${p.nom}</h4>
                    <div class="desc">${p.description || ''}</div>
                    <div class="price">${p.prix} $</div>
                    <button class="btn-reserver" onclick="window.open('${msgLink}')">⚡ RÉSERVER</button>
                `;

                // Effet 3D dynamique
                card.addEventListener('mousemove', e => {
                    const r = card.getBoundingClientRect();
                    const x = e.clientX - r.left - r.width / 2;
                    const y = e.clientY - r.top - r.height / 2;
                    card.style.transform = `perspective(700px) rotateY(${x/12}deg) rotateX(${-y/12}deg) translateZ(20px) scale(1.05)`;
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
    if (!q) {
        render(globalProducts);
        return;
    }
    const filtered = globalProducts.filter(p => 
        p.nom.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
    );
    render(filtered);
}

function toggleMenu() {
    document.getElementById('navMenu').classList.toggle('open');
}

function toggleCatalogue() {
    document.getElementById('catContent').classList.toggle('open');
}

// ==========================================
// 6. GESTION DE L'ADMINISTRATION (CODE: 200511)
// ==========================================
function checkAdminAccess() {
    if (isAdminLoggedIn) return true;
    const code = prompt("Veuillez saisir le code administrateur :");
    if (code === ADMIN_CODE) {
        isAdminLoggedIn = true;
        return true;
    } else {
        alert("Code administrateur incorrect !");
        return false;
    }
}

function openAdmin() {
    if (!checkAdminAccess()) return;
    document.getElementById('popupAdmin').style.display = 'flex';
}

function closeAdmin() {
    document.getElementById('popupAdmin').style.display = 'none';
}

// Prévisualisation d'image
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

// Ajouter un produit dans Supabase (Nouveau élément en tête)
async function addProduct() {
    const nom = document.getElementById('nom').value.trim();
    const desc = document.getElementById('desc').value.trim();
    const prix = parseFloat(document.getElementById('prix').value);
    const cat = document.getElementById('cat').value;
    const preview = document.getElementById('preview').src;

    if (!nom || !cat || isNaN(prix)) {
        alert('Veuillez remplir le Nom, la Catégorie et un Prix valide.');
        return;
    }

    const imgSrc = preview || ('https://via.placeholder.com/400?text=' + encodeURIComponent(nom));

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
        const { error } = await supabaseClient
            .from('produits')
            .insert([newProduct]);

        if (error) throw error;
        alert("Produit ajouté avec succès sur Supabase !");
    } catch (err) {
        console.warn("Supabase local fallback: ", err.message);
        // Sauvegarde de secours en LocalStorage
        globalProducts.unshift({ id: Date.now().toString(), ...newProduct });
        localStorage.setItem('bazarNobsy_3D', JSON.stringify(globalProducts));
    }

    // Réinitialisation des champs du formulaire
    document.getElementById('nom').value = '';
    document.getElementById('desc').value = '';
    document.getElementById('prix').value = '';
    document.getElementById('cat').value = '';
    document.getElementById('img').value = '';
    document.getElementById('preview').style.display = 'none';

    closeAdmin();
    await reloadAndRender();
}

// Supprimer un produit
async function deleteProd(id) {
    if (!checkAdminAccess()) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
        const { error } = await supabaseClient
            .from('produits')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (err) {
        console.warn("Supabase local delete fallback:", err.message);
        globalProducts = globalProducts.filter(p => String(p.id) !== String(id));
        localStorage.setItem('bazarNobsy_3D', JSON.stringify(globalProducts));
    }

    await reloadAndRender();
}

// Lancement au chargement
init();
