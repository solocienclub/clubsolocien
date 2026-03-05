const panel = document.getElementById("panelContent")

/* =========================
FETCH AUTENTICADO
========================= */

async function authFetch(url, options = {}) {

options.headers = {
...(options.headers || {}),
Authorization: `Bearer ${token}`
}

try {

const res = await fetch(url, options)

if (!res.ok) {

const text = await res.text()
throw new Error(text || "Error en la petición")

}

return res

} catch (error) {

console.error("Error fetch:", error)

alert("Error conectando con el servidor")

throw error

}

}

/* =========================
FORMATEAR DINERO
========================= */

function formatMoney(value){

if(!value) return "$0"

return "$" + Number(value).toLocaleString("es-CO")

}

/* =========================
DASHBOARD
========================= */

async function loadDashboard(){

try{

const res = await authFetch("/admin/stats")
const data = await res.json()

panel.innerHTML = `

<div class="card">
Usuarios registrados<br>
<strong>${data.users || 0}</strong>
</div>

<div class="card">
Rifas activas<br>
<strong>${data.raffles || 0}</strong>
</div>

<div class="card">
Ingresos reales<br>
<strong>${formatMoney(data.income)}</strong>
</div>

`

}catch(error){

panel.innerHTML="<div class='card'>Error cargando dashboard</div>"

}

}

/* =========================
USUARIOS
========================= */

async function loadUsers(){

try{

const res = await authFetch("/admin/users")
const users = await res.json()

let html = `
<div class="card">
<h3>Usuarios</h3>

<table>

<tr>
<th>ID</th>
<th>Nombre</th>
<th>Email</th>
<th>Cédula</th>
<th>Números</th>
<th>Total gastado</th>
</tr>
`

users.forEach(u=>{

html += `

<tr>
<td>${u.id}</td>
<td>${u.name || ""} ${u.lastname || ""}</td>
<td>${u.email || ""}</td>
<td>${u.cedula || "-"}</td>
<td>${u.numeros_comprados || 0}</td>
<td>${formatMoney(u.total_gastado)}</td>
</tr>

`

})

html += `</table></div>`

panel.innerHTML = html

}catch(error){

panel.innerHTML="<div class='card'>Error cargando usuarios</div>"

}

}

/* =========================
RIFAS
========================= */

async function loadRaffles(){

try{

const res = await authFetch("/admin/raffles")
const raffles = await res.json()

let html = `

<div class="card">

<button class="create" onclick="createRaffle()">
Crear rifa
</button>

<table>

<tr>
<th>ID</th>
<th>Título</th>
<th>Precio</th>
<th>Estado</th>
<th>Acciones</th>
</tr>
`

raffles.forEach(r=>{

html += `

<tr>

<td>${r.id}</td>
<td>${r.title}</td>
<td>${formatMoney(r.ticket_price)}</td>
<td>${r.status}</td>

<td>

<button class="delete" onclick="deleteRaffle(${r.id})">
Eliminar
</button>

<button onclick="toggleRaffle(${r.id}, '${r.status}')">
${r.status === "active" ? "Ocultar" : "Mostrar"}
</button>

</td>

</tr>

`

})

html += `</table></div>`

panel.innerHTML = html

}catch(error){

panel.innerHTML="<div class='card'>Error cargando rifas</div>"

}

}

async function deleteRaffle(id){

if(!confirm("Eliminar rifa?")) return

try{

await authFetch(`/raffles/${id}`,{
method:"DELETE"
})

loadRaffles()

}catch(error){

alert("Error eliminando rifa")

}

}

/* =========================
CREAR RIFA
========================= */

async function createRaffle(){

const title = prompt("Título de la rifa")
if(!title) return

const prize = prompt("Premio")
const price = prompt("Precio por número")

const input = document.createElement("input")
input.type = "file"
input.accept = "image/*"

input.onchange = async function(){

const file = input.files[0]

const formData = new FormData()

formData.append("title",title)
formData.append("prize",prize)
formData.append("ticket_price",price)

if(file){
formData.append("image",file)
}

try{

await authFetch("/admin/create-raffle",{
method:"POST",
body:formData
})

alert("Rifa creada")
loadRaffles()

}catch(error){

alert("Error creando rifa")

}

}

input.click()

}

/* =========================
NUMEROS
========================= */

async function loadNumbers(){

try{

const res = await authFetch("/admin/numbers")
const numbers = await res.json()

let html = `

<div class="card">

<table>

<tr>
<th>Número</th>
<th>Estado</th>
<th>Usuario</th>
</tr>
`

numbers.forEach(n=>{

html += `

<tr>

<td>${n.number}</td>
<td>${n.status}</td>
<td>${n.name || "-"}</td>

</tr>

`

})

html += `</table></div>`

panel.innerHTML = html

}catch(error){

panel.innerHTML="<div class='card'>Error cargando números</div>"

}

}

/* =========================
VENTAS
========================= */

async function loadSales(){

try{

const res = await authFetch("/admin/sales")
const sales = await res.json()

let html = `

<div class="card">

<table>

<tr>
<th>Rifa</th>
<th>Números vendidos</th>
<th>Ingresos</th>
</tr>
`

sales.forEach(s=>{

html += `

<tr>

<td>${s.title}</td>
<td>${s.vendidos || 0}</td>
<td>${formatMoney(s.ingresos)}</td>

</tr>

`

})

html += `</table></div>`

panel.innerHTML = html

}catch(error){

panel.innerHTML="<div class='card'>Error cargando ventas</div>"

}

}

async function hideRaffle(id){

try{

await authFetch(`/admin/raffles/hide/${id}`,{
method:"PUT"
})

loadRaffles()

}catch(error){

alert("Error ocultando rifa")

}

}

async function toggleRaffle(id,status){

try{

if(status === "active"){

await authFetch(`/admin/raffles/hide/${id}`,{
method:"PUT"
})

}else{

await authFetch(`/admin/raffles/show/${id}`,{
method:"PUT"
})

}

loadRaffles()

}catch(error){

alert("Error cambiando estado de la rifa")

}

}

/* =========================
INICIO
========================= */

loadDashboard()