// CONFIG SUPABASE - garde tes clés à toi
const SUPABASE_URL = "https://TON_URL.supabase.co";
const SUPABASE_KEY = "TA_CLE_ANON";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIES = ['xbox','playstation','nintendo','console','pop','film','skylander'];
let allProducts = [];
let selectedProducts = new Set();

// --- INIT ---
document.addEventListener('DOMContentLoaded', async ()=>{
    await loadProducts();
    setupPreview();
});

async function loadProducts(){
    const { data, error } = await supabaseClient.from('produits').select('*').order('created_at',{ascending:false});
    if(error){ console.error(error); return; }
    allProducts = data || [];
    renderAll();
}

function renderAll(list = allProducts){
    // vide toutes les grilles
    CATEGORIES.forEach(cat => {
        const grid = document.getElementById(`grid-${cat}`);
        if(grid) grid.innerHTML = "";
    });

    if(list.length === 0){
        document.getElementById('grid-xbox').innerHTML = "<p style='color:#666'>Aucun produit</p>";
        return;
    }

    list.forEach(prod => {
        const card = create3DCard(prod);
        const target = document.getElementById(`grid-${prod.categorie}`);
        if(target) target.appendChild(card);
        else document.getElementById('grid-console').appendChild(card); // fallback
    });
}

function create3DCard(p){
    const div = document.createElement('div');
    div.className = 'product-card';
    div.dataset.id = p.id;
    div.dataset.name = p.nom.toLowerCase();

    // Couleur néon selon catégorie
    const neon = {
        xbox: '#107c10',
        playstation: '#0070cc',
        nintendo: '#e60012',
        console: '#00f2ff',
        pop: '#ff00e5',
        film: '#ffcc00',
        skylander: '#ff6a00'
    }[p.categorie] || '#00f2ff';

    div.style.borderColor = neon;
    div.style.boxShadow = `0 0 20px ${neon}66, 0 15px 30px black`;

    div.innerHTML = `
        <div style="position:relative; transform-style:preserve-3d;">
            <img src="${p.image_url}" alt="${p.nom}" loading="lazy">
            <div class="card-glow" style="position:absolute; inset:0; background:radial-gradient(600px at var(--x,50%) var(--y,50%), ${neon}22, transparent 60%); pointer-events:none; transform:translateZ(10px);"></div>
        </div>
        <h4>${p.nom}</h4>
        <p>${p.description || ''}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; transform:translateZ(30px);">
            <span style="color:${neon}; font-weight:800; text-shadow:0 0 10px ${neon};">${p.prix} $</span>
            <span style="font-size:10px; opacity:0.6; border:1px solid ${neon}; padding:4px 8px;">${p.categorie.toUpperCase()}</span>
        </div>
        <div style="margin-top:10px; display:flex; gap:5px; transform:translateZ(20px);">
            <input type="checkbox" class="chk" onchange="toggleSelect('${p.id}')" style="accent-color:${neon}">
            <button onclick="deleteProduct('${p.id}')" style="background:transparent; border:1px solid red; color:red; padding:4px 8px; font-size:10px; cursor:pointer;">DELETE</button>
        </div>
    `;

    // Effet 3D souris sur chaque carte
    div.addEventListener('mousemove', (e)=>{
        const rect = div.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        div.style.setProperty('--x', `${x}px`);
        div.style.setProperty('--y', `${y}px`);
        const rx = (y - rect.height/2) / 10;
        const ry = (rect.width/2 - x) / 10;
        div.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(20px) scale(1.05)`;
    });
    div.addEventListener('mouseleave', ()=>{
        div.style.transform = `perspective(900px) rotateX(0) rotateY(0) translateZ(0) scale(1)`;
    });

    return div;
}

// --- FILTRE CATÉGORIE 3D ---
function filterByCategory(cat){
    CATEGORIES.forEach(c=>{
        const sec = document.getElementById(c);
        if(sec) sec.style.display = (c === cat) ? 'block' : 'none';
    });
    document.getElementById('category-back-button').style.display = 'block';
    document.getElementById('default-title').innerText = `// ${cat.toUpperCase()} //`;
    window.scrollTo({top: document.getElementById('produits').offsetTop - 80, behavior:'smooth'});
}

function showAllCategories(){
    CATEGORIES.forEach(c=>{
        const sec = document.getElementById(c);
        if(sec) sec.style.display = 'block';
    });
    document.getElementById('category-back-button').style.display = 'none';
    document.getElementById('default-title').innerText = `INVENTAIRE // 3D VAULT`;
}

// --- RECHERCHE ---
function searchProducts(){
    const q = document.getElementById('searchProduct').value.toLowerCase();
    if(!q){ renderAll(); return; }
    const filtered = allProducts.filter(p => p.nom.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
    renderAll(filtered);
}

// --- MENU ---
function toggleMenu(){
    const m = document.getElementById('navMenu');
    m.classList.toggle('open');
    m.style.display = m.classList.contains('open') ? 'flex' : 'none';
}
function toggleCatalogue(){
    document.getElementById('catContent').classList.toggle('open');
}

// --- AJOUT PRODUIT ---
function setupPreview(){
    const input = document.getElementById('imageProduit');
    if(!input) return;
    input.addEventListener('change', e=>{
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = ev=>{
            document.getElementById('imagePreview').src = ev.target.result;
            document.getElementById('preview-container').style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('formAjoutProduit').addEventListener('submit', async (e)=>{
        e.preventDefault();
        const file = input.files[0];
        if(!file) return alert('Photo manquante');

        const fileName = `${Date.now()}_${file.name}`;
        const { error: upErr } = await supabaseClient.storage.from('images').upload(fileName, file);
        if(upErr) return alert('Erreur upload: '+upErr.message);

        const { data } = supabaseClient.storage.from('images').getPublicUrl(fileName);

        const newProd = {
            nom: document.getElementById('nomProduit').value,
            description: document.getElementById('descProduit').value,
            prix: parseFloat(document.getElementById('prixProduit').value),
            categorie: document.getElementById('categorieProduit').value,
            image_url: data.publicUrl
        };

        const { error } = await supabaseClient.from('produits').insert([newProd]);
        if(error) alert(error.message);
        else { alert('PRODUIT AJOUTÉ EN 3D !'); e.target.reset(); document.getElementById('preview-container').style.display='none'; loadProducts(); }
    });
}

// --- SUPPRESSION ---
function toggleSelect(id){
    if(selectedProducts.has(id)) selectedProducts.delete(id);
    else selectedProducts.add(id);
    document.getElementById('btn-bulk-delete').style.display = selectedProducts.size > 0 ? 'inline-block' : 'none';
}
async function deleteProduct(id){
    if(!confirm('DELETE THIS ITEM ?')) return;
    await supabaseClient.from('produits').delete().eq('id', id);
    loadProducts();
}
async function deleteSelectedProducts(){
    if(selectedProducts.size === 0) return;
    if(!confirm(`Supprimer ${selectedProducts.size} produits ?`)) return;
    for(let id of selectedProducts){
        await supabaseClient.from('produits').delete().eq('id', id);
    }
    selectedProducts.clear();
    loadProducts();
}

// --- ADMIN PIN ---
function verifierPin(){
    const pin = document.getElementById('inputPin').value;
    if(pin === '123456'){ // CHANGE TON PIN ICI
        document.getElementById('admin').style.display = 'block';
        document.getElementById('popupPin').style.display = 'none';
        document.getElementById('admin').scrollIntoView({behavior:'smooth'});
    } else alert('PIN FAUX');
    }
